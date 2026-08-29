"""Tests for voice cloning service (XTTS v2)."""
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.voice_cloning import clone_voice, validate_voice_duration, MIN_SAMPLE_DURATION, MAX_SAMPLE_DURATION


def test_clone_voice_signature():
    """Test that clone_voice function has the correct signature."""
    import inspect
    sig = inspect.signature(clone_voice)
    params = list(sig.parameters.keys())

    assert "text" in params
    assert "speaker_wav" in params
    assert "language" in params
    assert "output_path" in params
    assert "speaker_embedding" in params

    # Check defaults
    assert sig.parameters["speaker_embedding"].default is None


def test_clone_voice_uses_speaker_wav_in_tts_call():
    """
    Verify that clone_voice passes speaker_wav to model.tts_to_file().
    This is the critical fix for XTTS v2 voice cloning quality.
    """
    # We need to mock TTS to verify the call
    with patch("app.services.voice_cloning.TTS_AVAILABLE", True):
        with patch("app.services.voice_cloning.initialize_xtts") as mock_init:
            with patch("app.services.voice_cloning.librosa.get_duration", return_value=5.0):
                with patch("app.services.voice_cloning.librosa.load") as mock_load:
                    with patch("app.services.voice_cloning.sf.write") as mock_write:
                        mock_model = MagicMock()
                        mock_init.return_value = mock_model
                        mock_load.return_value = (None, 24000)

                        # Call the function
                        import asyncio
                        output_path = Path("/path/to/output.mp3")
                        asyncio.run(clone_voice(
                            text="Hello world",
                            speaker_wav="/path/to/reference.wav",
                            language="en",
                            output_path=output_path
                        ))

                        # Verify tts_to_file was called with speaker_wav
                        mock_model.tts_to_file.assert_called_once()
                        call_kwargs = mock_model.tts_to_file.call_args.kwargs

                        assert "speaker_wav" in call_kwargs
                        # The speaker_wav might be the original or a trimmed version
                        assert call_kwargs["speaker_wav"] is not None
                        assert call_kwargs["text"] == "Hello world"
                        assert call_kwargs["language"] == "en"
                        # Compare paths using Path to handle Windows/Unix differences
                        assert Path(call_kwargs["file_path"]) == output_path


def test_validate_voice_duration_valid():
    """Test validate_voice_duration with a valid duration file."""
    # Create a mock audio file that librosa will read as 5 seconds
    with patch("app.services.voice_cloning.librosa.get_duration", return_value=5.0):
        duration = validate_voice_duration("/path/to/valid.wav")
        assert duration == 5.0


def test_validate_voice_duration_too_short():
    """Test validate_voice_duration raises for too short audio."""
    with patch("app.services.voice_cloning.librosa.get_duration", return_value=1.0):
        with pytest.raises(ValueError, match="too short"):
            validate_voice_duration("/path/to/short.wav")


def test_validate_voice_duration_too_long():
    """Test validate_voice_duration raises for too long audio."""
    with patch("app.services.voice_cloning.librosa.get_duration", return_value=45.0):
        with pytest.raises(ValueError, match="too long"):
            validate_voice_duration("/path/to/long.wav")


def test_validate_voice_duration_unreadable():
    """Test validate_voice_duration raises for unreadable file."""
    with patch("app.services.voice_cloning.librosa.get_duration", side_effect=Exception("Cannot read")):
        with pytest.raises(ValueError, match="Could not read audio file"):
            validate_voice_duration("/path/to/bad.wav")


def test_min_max_sample_duration_constants():
    """Test that MIN/MAX duration constants are set correctly."""
    assert MIN_SAMPLE_DURATION == 3.0
    assert MAX_SAMPLE_DURATION == 30.0


@pytest.mark.asyncio
async def test_clone_voice_raises_when_tts_not_available():
    """Test clone_voice raises RuntimeError when TTS not installed."""
    with patch("app.services.voice_cloning.TTS_AVAILABLE", False):
        with pytest.raises(RuntimeError, match="Coqui TTS not installed"):
            await clone_voice(
                text="Hello",
                speaker_wav="/path/to/ref.wav",
                language="en",
                output_path=Path("/path/to/out.mp3")
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])