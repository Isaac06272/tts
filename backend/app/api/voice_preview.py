import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.core.config import settings
from app.services.edge_tts import generate_audio
from app.database.session import get_session
from app.database.models import CustomVoice
from sqlmodel import select
from uuid import UUID

router = APIRouter()

VOICES_JSON_PATH = Path(settings.BASE_DIR) / "app" / "data" / "voices.json"

# In-memory cache for generated preview paths
_preview_cache = {}


@router.get("/voice-preview/{voice_id}")
async def get_voice_preview(voice_id: str):
    """
    Return a short audio preview for a voice.
    - For Edge-TTS voices: generate a 3-second clip using "Hello, this is a preview."
    - For custom voices: return the uploaded sample file.
    """
    # Handle custom voices (prefix "custom-")
    if voice_id.startswith("custom-"):
        custom_voice_uuid = voice_id.replace("custom-", "")
        try:
            UUID(custom_voice_uuid)
        except ValueError:
            raise HTTPException(status_code=404, detail="Voice not found")

        async for session in get_session():
            result = await session.exec(
                select(CustomVoice).where(CustomVoice.id == UUID(custom_voice_uuid))
            )
            custom_voice = result.first()
            if not custom_voice or not custom_voice.is_active:
                raise HTTPException(status_code=404, detail="Voice not found")

            sample_path = settings.BASE_DIR / custom_voice.sample_path
            if not sample_path.exists():
                raise HTTPException(status_code=404, detail="Voice sample not found")

            # Determine media type based on file extension
            ext = sample_path.suffix.lower()
            media_type_map = {
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.m4a': 'audio/mp4',
                '.flac': 'audio/flac',
                '.ogg': 'audio/ogg',
                '.webm': 'audio/webm',
                '.aac': 'audio/aac',
            }
            media_type = media_type_map.get(ext, 'audio/mpeg')

            def iterfile():
                with open(sample_path, "rb") as f:
                    yield from f

            return StreamingResponse(
                iterfile(),
                media_type=media_type,
                headers={
                    "Content-Disposition": f'inline; filename="preview{ext}"',
                    "Cache-Control": "public, max-age=3600",
                }
            )

    # Handle Edge-TTS voices
    # Load voices.json to validate voice_id exists
    with open(VOICES_JSON_PATH) as f:
        voices_data = json.load(f)

    # voices.json is an array, not an object with "voices" key
    voice_info = next((v for v in voices_data if v["id"] == voice_id), None)
    if not voice_info:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Check cache first
    if voice_id in _preview_cache:
        cached_path = _preview_cache[voice_id]
        if Path(cached_path).exists():
            def iterfile():
                with open(cached_path, "rb") as f:
                    yield from f

            return StreamingResponse(
                iterfile(),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": f'inline; filename="preview_{voice_id}.mp3"',
                    "Cache-Control": "public, max-age=3600",
                }
            )

    # Generate preview clip (short text for quick generation)
    preview_text = "Hello, this is a preview."
    output_dir = Path(settings.OUTPUT_DIR) / "previews"
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_path = output_dir / f"{voice_id}_preview.mp3"

    try:
        await generate_audio(preview_text, voice_id, preview_path)
        _preview_cache[voice_id] = str(preview_path)

        def iterfile():
            with open(preview_path, "rb") as f:
                yield from f

        return StreamingResponse(
            iterfile(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="preview_{voice_id}.mp3"',
                "Cache-Control": "public, max-age=3600",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")