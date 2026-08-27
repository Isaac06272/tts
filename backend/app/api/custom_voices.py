import shutil
from uuid import uuid4
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.core.config import settings
from app.database.session import get_session
from app.database.models import CustomVoice
from app.schemas import (
    CustomVoiceCreate,
    CustomVoiceRead,
    CustomVoiceUpdate,
    CustomVoiceListResponse,
)
from app.services.voice_cloning import validate_voice_duration

router = APIRouter()

# Allowed extensions for voice samples
ALLOWED_VOICE_EXTENSIONS = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'}
MAX_VOICE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_CUSTOM_VOICES = 10
VOICES_UPLOAD_DIR = Path(settings.BASE_DIR) / "static" / "uploads" / "voices"


def validate_voice_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_VOICE_EXTENSIONS


@router.post("/custom-voices", response_model=CustomVoiceRead, status_code=status.HTTP_201_CREATED)
async def create_custom_voice(
    name: str = Form(...),
    description: str = Form(""),
    language: str = Form("en"),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    """Upload a voice sample and create a custom voice."""
    # Validate file
    if not file.filename or not validate_voice_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_VOICE_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_VOICE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB."
        )

    # Check voice count limit
    count_result = await session.exec(select(CustomVoice).where(CustomVoice.is_active == True))
    active_count = len(count_result.all())
    if active_count >= MAX_CUSTOM_VOICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_CUSTOM_VOICES} custom voices allowed. Delete unused voices first."
        )

    # Create voice directory
    voice_id = uuid4()
    voice_dir = VOICES_UPLOAD_DIR / str(voice_id)
    voice_dir.mkdir(parents=True, exist_ok=True)

    # Save sample file
    file_ext = Path(file.filename).suffix.lower()
    sample_path = voice_dir / f"sample{file_ext}"
    sample_path.write_bytes(content)

    # Validate duration
    duration = validate_voice_duration(str(sample_path))

    # Save to database
    # Note: voice_id stores the sample path for XTTS to use directly
    custom_voice = CustomVoice(
        id=voice_id,
        name=name,
        description=description,
        sample_path=str(sample_path.relative_to(settings.BASE_DIR)),
        voice_id=str(sample_path.relative_to(settings.BASE_DIR)),
        language=language,
        is_active=True,
    )
    session.add(custom_voice)
    await session.commit()
    await session.refresh(custom_voice)

    return CustomVoiceRead.model_validate(custom_voice)


@router.get("/custom-voices", response_model=CustomVoiceListResponse)
async def list_custom_voices(
    session: AsyncSession = Depends(get_session),
    active_only: bool = True
):
    """List all custom voices."""
    query = select(CustomVoice)
    if active_only:
        query = query.where(CustomVoice.is_active == True)
    query = query.order_by(CustomVoice.created_at.desc())

    result = await session.exec(query)
    voices = result.all()

    return CustomVoiceListResponse(voices=[CustomVoiceRead.model_validate(v) for v in voices])


@router.get("/custom-voices/{voice_id}", response_model=CustomVoiceRead)
async def get_custom_voice(
    voice_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a specific custom voice."""
    from uuid import UUID

    result = await session.exec(
        select(CustomVoice).where(CustomVoice.id == UUID(voice_id))
    )
    voice = result.first()

    if not voice:
        raise HTTPException(status_code=404, detail="Custom voice not found")

    return CustomVoiceRead.model_validate(voice)


@router.patch("/custom-voices/{voice_id}", response_model=CustomVoiceRead)
async def update_custom_voice(
    voice_id: str,
    update_data: CustomVoiceUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update custom voice metadata."""
    from uuid import UUID

    result = await session.exec(
        select(CustomVoice).where(CustomVoice.id == UUID(voice_id))
    )
    voice = result.first()

    if not voice:
        raise HTTPException(status_code=404, detail="Custom voice not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(voice, key, value)

    session.add(voice)
    await session.commit()
    await session.refresh(voice)

    return CustomVoiceRead.model_validate(voice)


@router.delete("/custom-voices/{voice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_voice(
    voice_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Delete a custom voice and its files."""
    from uuid import UUID

    result = await session.exec(
        select(CustomVoice).where(CustomVoice.id == UUID(voice_id))
    )
    voice = result.first()

    if not voice:
        raise HTTPException(status_code=404, detail="Custom voice not found")

    # Delete files
    sample_path = settings.BASE_DIR / voice.sample_path
    embedding_path = settings.BASE_DIR / voice.voice_id

    if sample_path.exists():
        sample_path.unlink(missing_ok=True)
    if embedding_path.exists():
        embedding_path.unlink(missing_ok=True)

    # Delete voice directory if empty
    voice_dir = sample_path.parent
    try:
        voice_dir.rmdir()
    except OSError:
        pass  # Directory not empty

    # Delete from database
    await session.delete(voice)
    await session.commit()