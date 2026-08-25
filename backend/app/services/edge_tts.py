import edge_tts
from pathlib import Path
from typing import Optional
from uuid import uuid4
from app.core.config import settings


async def generate_audio(text: str, voice_id: str, output_path: Optional[Path] = None) -> Path:
    """
    Generate audio using Microsoft Edge-TTS.

    Args:
        text: Text to convert to speech
        voice_id: Microsoft Edge voice ID (e.g., "en-US-AriaNeural")
        output_path: Optional custom output path

    Returns:
        Path to the generated audio file
    """
    if output_path is None:
        output_dir = Path(settings.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{uuid4()}.mp3"

    communicate = edge_tts.Communicate(text, voice_id)
    await communicate.save(str(output_path))

    return output_path


async def list_voices() -> list[dict]:
    """List all available Edge-TTS voices."""
    voices = await edge_tts.list_voices()
    return voices