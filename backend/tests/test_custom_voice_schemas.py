"""Tests for Custom Voice Pydantic Schemas."""

from datetime import datetime
from uuid import UUID, uuid4
from pydantic import ValidationError

from app.schemas import (
    CustomVoiceBase,
    CustomVoiceCreate,
    CustomVoiceUpdate,
    CustomVoiceRead,
    CustomVoiceListResponse,
)


def test_custom_voice_base_valid():
    """Test CustomVoiceBase with valid data."""
    data = {
        "name": "Test Voice",
        "description": "A test voice for testing",
        "language": "en-US",
    }
    voice = CustomVoiceBase(**data)
    assert voice.name == "Test Voice"
    assert voice.description == "A test voice for testing"
    assert voice.language == "en-US"


def test_custom_voice_base_missing_required():
    """Test CustomVoiceBase fails with missing required fields."""
    data = {
        "name": "Test Voice",
        # missing description and language
    }
    try:
        CustomVoiceBase(**data)
        assert False, "Should have raised ValidationError"
    except ValidationError as e:
        errors = e.errors()
        assert len(errors) == 2
        fields = {err["loc"][0] for err in errors}
        assert "description" in fields
        assert "language" in fields


def test_custom_voice_base_empty_name():
    """Test CustomVoiceBase fails with empty name."""
    data = {
        "name": "",
        "description": "A test voice",
        "language": "en-US",
    }
    try:
        CustomVoiceBase(**data)
        assert False, "Should have raised ValidationError"
    except ValidationError as e:
        errors = e.errors()
        assert any(err["loc"][0] == "name" for err in errors)


def test_custom_voice_create_inherits_base():
    """Test CustomVoiceCreate inherits from CustomVoiceBase."""
    data = {
        "name": "Test Voice",
        "description": "A test voice for testing",
        "language": "en-US",
    }
    voice = CustomVoiceCreate(**data)
    assert voice.name == "Test Voice"
    assert voice.description == "A test voice for testing"
    assert voice.language == "en-US"


def test_custom_voice_update_all_optional():
    """Test CustomVoiceUpdate has all fields optional."""
    # Empty update should be valid
    voice = CustomVoiceUpdate()
    assert voice.name is None
    assert voice.description is None
    assert voice.language is None
    assert voice.is_active is None

    # Partial update should be valid
    voice = CustomVoiceUpdate(name="New Name")
    assert voice.name == "New Name"
    assert voice.description is None
    assert voice.language is None


def test_custom_voice_update_with_values():
    """Test CustomVoiceUpdate with values."""
    data = {
        "name": "Updated Voice",
        "description": "Updated description",
        "language": "fr-FR",
        "is_active": False,
    }
    voice = CustomVoiceUpdate(**data)
    assert voice.name == "Updated Voice"
    assert voice.description == "Updated description"
    assert voice.language == "fr-FR"
    assert voice.is_active is False


def test_custom_voice_read_includes_all_fields():
    """Test CustomVoiceRead includes all fields including ID and timestamps."""
    voice_id = uuid4()
    created_at = datetime(2024, 1, 1, 12, 0, 0)
    updated_at = datetime(2024, 1, 2, 12, 0, 0)

    data = {
        "id": voice_id,
        "name": "Test Voice",
        "description": "A test voice",
        "language": "en-US",
        "sample_path": "/path/to/sample.wav",
        "voice_id": "elevenlabs_voice_123",
        "is_active": True,
        "created_at": created_at,
        "updated_at": updated_at,
    }
    voice = CustomVoiceRead(**data)
    assert voice.id == voice_id
    assert voice.name == "Test Voice"
    assert voice.description == "A test voice"
    assert voice.language == "en-US"
    assert voice.sample_path == "/path/to/sample.wav"
    assert voice.voice_id == "elevenlabs_voice_123"
    assert voice.is_active is True
    assert voice.created_at == created_at
    assert voice.updated_at == updated_at


def test_custom_voice_read_missing_required():
    """Test CustomVoiceRead fails with missing required fields."""
    data = {
        "id": uuid4(),
        "name": "Test Voice",
        # missing other required fields
    }
    try:
        CustomVoiceRead(**data)
        assert False, "Should have raised ValidationError"
    except ValidationError as e:
        errors = e.errors()
        # Should have errors for all missing required fields
        assert len(errors) >= 7


def test_custom_voice_list_response():
    """Test CustomVoiceListResponse wrapper."""
    voice1 = CustomVoiceRead(
        id=uuid4(),
        name="Voice 1",
        description="First voice",
        language="en-US",
        sample_path="/path/1.wav",
        voice_id="id_1",
        is_active=True,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    voice2 = CustomVoiceRead(
        id=uuid4(),
        name="Voice 2",
        description="Second voice",
        language="es-ES",
        sample_path="/path/2.wav",
        voice_id="id_2",
        is_active=False,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    response = CustomVoiceListResponse(voices=[voice1, voice2])
    assert len(response.voices) == 2
    assert response.voices[0].name == "Voice 1"
    assert response.voices[1].name == "Voice 2"
    assert response.voices[1].is_active is False


def test_custom_voice_list_response_empty():
    """Test CustomVoiceListResponse with empty list."""
    response = CustomVoiceListResponse(voices=[])
    assert response.voices == []


def test_custom_voice_language_validation():
    """Test language field accepts various language codes."""
    for lang in ["en-US", "fr-FR", "es-ES", "de-DE", "zh-CN", "ja-JP"]:
        voice = CustomVoiceBase(name="Test", description="Desc", language=lang)
        assert voice.language == lang


if __name__ == "__main__":
    # Run tests manually
    test_custom_voice_base_valid()
    print("✓ test_custom_voice_base_valid")

    test_custom_voice_base_missing_required()
    print("✓ test_custom_voice_base_missing_required")

    test_custom_voice_base_empty_name()
    print("✓ test_custom_voice_base_empty_name")

    test_custom_voice_create_inherits_base()
    print("✓ test_custom_voice_create_inherits_base")

    test_custom_voice_update_all_optional()
    print("✓ test_custom_voice_update_all_optional")

    test_custom_voice_update_with_values()
    print("✓ test_custom_voice_update_with_values")

    test_custom_voice_read_includes_all_fields()
    print("✓ test_custom_voice_read_includes_all_fields")

    test_custom_voice_read_missing_required()
    print("✓ test_custom_voice_read_missing_required")

    test_custom_voice_list_response()
    print("✓ test_custom_voice_list_response")

    test_custom_voice_list_response_empty()
    print("✓ test_custom_voice_list_response_empty")

    test_custom_voice_language_validation()
    print("✓ test_custom_voice_language_validation")

    print("\nAll tests passed!")