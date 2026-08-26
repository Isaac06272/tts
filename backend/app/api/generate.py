import json
import shutil
from uuid import uuid4
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings
from app.database.session import get_session
from app.database.models import Generation
from app.schemas import (
    GenerateRequest,
    GenerateResponse,
    TranscriptOutput,
    SegmentTimestamp,
    TranscribeAudioResponse,
)

# Removed TranscriptOnlyRequest - no longer needed
from app.services.edge_tts import generate_audio
from app.services.whisper import transcribe_audio

router = APIRouter()

# Supported audio formats for transcription
ALLOWED_AUDIO_EXTENSIONS = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'}

def validate_audio_file(filename: str) -> bool:
    """Validate if the uploaded file has an allowed audio extension."""
    return Path(filename).suffix.lower() in ALLOWED_AUDIO_EXTENSIONS


@router.post("/generate", response_model=GenerateResponse, status_code=status.HTTP_201_CREATED)
async def generate_speech(
    request: GenerateRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Generate speech from text using Edge-TTS, then transcribe with faster-whisper
    for segment-level timestamps.
    """
    generation_id = uuid4()
    output_dir = Path(settings.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    audio_path = output_dir / f"{generation_id}.mp3"
    transcript_path = output_dir / f"{generation_id}.json"

    try:
        # 1. Generate audio via Edge-TTS
        await generate_audio(request.text, request.voice_id, audio_path)

        # 2. Transcribe with faster-whisper for segment timestamps
        segments = await transcribe_audio(audio_path)

        # 3. Calculate duration
        duration = segments[-1].end if segments else 0.0

        # 4. Save transcript JSON
        transcript = TranscriptOutput(
            segments=segments,
            full_text=request.text,
            duration=duration
        )
        transcript_path.write_text(transcript.model_dump_json(), encoding="utf-8")

        # 5. Save to database
        generation = Generation(
            id=generation_id,
            text=request.text,
            voice_id=request.voice_id,
            audio_path=str(audio_path),
            transcript_path=str(transcript_path),
            duration=duration,
        )
        session.add(generation)
        await session.commit()
        await session.refresh(generation)

        # 6. Return URLs
        return GenerateResponse(
            id=generation.id,
            audio_url=f"/static/outputs/{generation_id}.mp3",
            transcript_url=f"/static/outputs/{generation_id}.json",
            created_at=generation.created_at,
            voice_id=generation.voice_id,
            text=generation.text,
        )

    except Exception as e:
        # Cleanup on failure
        if audio_path.exists():
            audio_path.unlink(missing_ok=True)
        if transcript_path.exists():
            transcript_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {str(e)}"
        )


@router.post("/transcribe", response_model=TranscribeAudioResponse, status_code=status.HTTP_201_CREATED)
async def transcribe_audio_file(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    """
    Transcribe an uploaded audio file using faster-whisper.
    Returns segment-level timestamps per sentence/phrase.

    Supports: wav, mp3, m4a, flac, ogg, webm, aac
    """
    # Validate file extension
    if not file.filename or not validate_audio_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )

    # Validate file size (max 50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB."
        )

    # Save uploaded file temporarily
    generation_id = uuid4()
    output_dir = Path(settings.OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    file_extension = Path(file.filename).suffix.lower()
    temp_audio_path = output_dir / f"{generation_id}_temp{file_extension}"
    transcript_path = output_dir / f"{generation_id}.json"

    try:
        # Write uploaded file
        temp_audio_path.write_bytes(content)

        # Transcribe with faster-whisper
        segments = await transcribe_audio(temp_audio_path)

        # Calculate duration
        duration = segments[-1].end if segments else 0.0

        # Save transcript JSON
        transcript = TranscriptOutput(
            segments=segments,
            full_text=" ".join(s.text for s in segments),
            duration=duration
        )
        transcript_path.write_text(transcript.model_dump_json(), encoding="utf-8")

        # Clean up temp audio file
        temp_audio_path.unlink(missing_ok=True)

        # Save to database
        generation = Generation(
            id=generation_id,
            text=transcript.full_text,
            voice_id="transcribed-audio",
            audio_path="",  # No audio file for transcriptions
            transcript_path=str(transcript_path),
            duration=duration,
        )
        session.add(generation)
        await session.commit()
        await session.refresh(generation)

        # Return the transcript output with generation_id
        return TranscribeAudioResponse(
            transcript=transcript,
            filename=file.filename,
            generation_id=str(generation.id)
        )

    except HTTPException:
        # Cleanup on failure
        if temp_audio_path.exists():
            temp_audio_path.unlink(missing_ok=True)
        if transcript_path.exists():
            transcript_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        # Cleanup on failure
        if temp_audio_path.exists():
            temp_audio_path.unlink(missing_ok=True)
        if transcript_path.exists():
            transcript_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )