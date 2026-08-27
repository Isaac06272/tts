import os
import torch
import librosa
from pathlib import Path
from typing import Optional
from app.core.config import settings

# Set COQUI_TOS_AGREED to avoid interactive prompt
os.environ.setdefault("COQUI_TOS_AGREED", "1")

# Try to import TTS, make it optional for environments without coqui-tts installed
try:
    from TTS.api import TTS
    TTS_AVAILABLE = True
except ImportError:
    TTS = None  # type: ignore
    TTS_AVAILABLE = False


_xtts_model: Optional["TTS"] = None  # type: ignore


def initialize_xtts() -> "TTS":  # type: ignore
    """Initialize XTTS v2 model (singleton)."""
    global _xtts_model
    if not TTS_AVAILABLE:
        raise RuntimeError("Coqui TTS not installed. Install with: pip install coqui-tts")
    if _xtts_model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _xtts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    return _xtts_model


async def clone_voice(
    text: str,
    speaker_wav: str,
    language: str,
    output_path: Path,
    speaker_embedding: Optional[str] = None
) -> Path:
    """
    Clone voice using XTTS v2.

    Args:
        text: Text to synthesize
        speaker_wav: Path to reference audio file (3-30 seconds)
        language: Language code (e.g., "en", "es", "fr")
        output_path: Output audio file path
        speaker_embedding: Optional pre-computed speaker embedding path (not used in current API)

    Returns:
        Path to generated audio file
    """
    if not TTS_AVAILABLE:
        raise RuntimeError("Coqui TTS not installed. Install with: pip install coqui-tts")

    model = initialize_xtts()

    # XTTS v2 can clone from a reference audio directly using speaker_wav
    model.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language=language,
        file_path=str(output_path)
    )

    return output_path


MIN_SAMPLE_DURATION = 3.0  # seconds
MAX_SAMPLE_DURATION = 30.0  # seconds

def validate_voice_duration(file_path: str) -> float:
    """Validate voice sample duration. Returns duration if valid."""
    try:
        duration = librosa.get_duration(path=file_path)
    except Exception as e:
        raise ValueError(f"Could not read audio file: {e}")

    if duration < MIN_SAMPLE_DURATION:
        raise ValueError(f"Voice sample too short ({duration:.1f}s). Minimum {MIN_SAMPLE_DURATION}s required.")
    if duration > MAX_SAMPLE_DURATION:
        raise ValueError(f"Voice sample too long ({duration:.1f}s). Maximum {MAX_SAMPLE_DURATION}s recommended.")

    return duration