"""Tests for CustomVoice model."""
import pytest
from uuid import UUID
from datetime import datetime
from app.database.models import CustomVoice


def test_custom_voice_model_creation():
    """Test creating a CustomVoice instance with all fields."""
    voice = CustomVoice(
        name="Test Voice",
        description="A test voice description",
        sample_path="/path/to/sample.wav",
        voice_id="xtts_speaker_123",
        language="en",
        is_active=True,
    )

    assert voice.name == "Test Voice"
    assert voice.description == "A test voice description"
    assert voice.sample_path == "/path/to/sample.wav"
    assert voice.voice_id == "xtts_speaker_123"
    assert voice.language == "en"
    assert voice.is_active is True
    assert isinstance(voice.id, UUID)
    assert isinstance(voice.created_at, datetime)
    assert isinstance(voice.updated_at, datetime)


def test_custom_voice_model_defaults():
    """Test CustomVoice model default values."""
    voice = CustomVoice(
        name="Minimal Voice",
        sample_path="/path/to/sample.wav",
        voice_id="xtts_speaker_456",
    )

    assert voice.name == "Minimal Voice"
    assert voice.description == ""
    assert voice.language == "en"
    assert voice.is_active is True
    assert isinstance(voice.id, UUID)
    assert isinstance(voice.created_at, datetime)
    assert isinstance(voice.updated_at, datetime)


def test_custom_voice_model_max_lengths():
    """Test CustomVoice model field max lengths."""
    # Name max 100 chars
    voice = CustomVoice(
        name="a" * 100,
        sample_path="/path/to/sample.wav",
        voice_id="xtts_speaker_789",
    )
    assert len(voice.name) == 100

    # Description max 500 chars
    voice2 = CustomVoice(
        name="Test",
        description="b" * 500,
        sample_path="/path/to/sample.wav",
        voice_id="xtts_speaker_789",
    )
    assert len(voice2.description) == 500

    # sample_path max 500 chars
    voice3 = CustomVoice(
        name="Test",
        sample_path="c" * 500,
        voice_id="xtts_speaker_789",
    )
    assert len(voice3.sample_path) == 500

    # voice_id max 100 chars
    voice4 = CustomVoice(
        name="Test",
        sample_path="/path/to/sample.wav",
        voice_id="d" * 100,
    )
    assert len(voice4.voice_id) == 100

    # language max 10 chars
    voice5 = CustomVoice(
        name="Test",
        sample_path="/path/to/sample.wav",
        voice_id="xtts_speaker_789",
        language="e" * 10,
    )
    assert len(voice5.language) == 10