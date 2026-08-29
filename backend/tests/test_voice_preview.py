"""Tests for voice preview API endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from pathlib import Path
from uuid import uuid4
from app.main import app
from app.database.models import CustomVoice
from app.core.config import settings
from app.database.session import get_session


@pytest.mark.asyncio
async def test_voice_preview_edge_tts():
    """Test that Edge-TTS voice preview returns audio/mpeg content."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/en-US-AriaNeural")
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert "Content-Disposition" in response.headers
    assert "Cache-Control" in response.headers
    assert len(response.content) > 0


@pytest.mark.asyncio
async def test_voice_preview_edge_tts_cached():
    """Second request should hit cache and return quickly"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response1 = await ac.get("/api/voice-preview/en-US-GuyNeural")
        response2 = await ac.get("/api/voice-preview/en-US-GuyNeural")
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response1.headers["content-type"] == "audio/mpeg"
    assert response2.headers["content-type"] == "audio/mpeg"


@pytest.mark.asyncio
async def test_voice_preview_not_found():
    """Test 404 for non-existent Edge-TTS voice"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/nonexistent-voice")
    assert response.status_code == 404
    assert response.json()["detail"] == "Voice not found"


@pytest.mark.asyncio
async def test_voice_preview_custom_voice_not_found():
    """Custom voice with invalid UUID should return 404"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/custom-invalid-uuid")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_voice_preview_custom_voice():
    """Test that custom voice preview returns the sample file."""
    custom_id = uuid4()
    voice_id = f"custom-{custom_id}"

    # Create a sample file
    uploads_dir = Path(settings.BASE_DIR) / "static" / "uploads" / "voices" / str(custom_id)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    sample_file = uploads_dir / "sample.mp3"
    sample_file.write_bytes(b"custom voice sample content")

    # Mock database session to return the custom voice
    custom_voice = CustomVoice(
        id=custom_id,
        name="Test Voice",
        description="A test custom voice",
        sample_path=str(sample_file.relative_to(settings.BASE_DIR)),
        voice_id=str(sample_file.relative_to(settings.BASE_DIR)),
        language="en",
        is_active=True,
    )

    # Override the get_session dependency - must be async generator
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = custom_voice
    mock_session.exec.return_value = mock_result

    async def override_get_session():
        yield mock_session

    # Need to override before creating the client
    app.dependency_overrides[get_session] = override_get_session

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get(f"/api/voice-preview/{voice_id}")

        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
        assert response.content == b"custom voice sample content"
    finally:
        app.dependency_overrides.clear()

    # Cleanup
    if sample_file.exists():
        sample_file.unlink()
    try:
        uploads_dir.rmdir()
    except OSError:
        pass


@pytest.mark.asyncio
async def test_voice_preview_custom_voice_different_formats():
    """Test custom voice preview with different audio formats."""
    custom_id = uuid4()
    voice_id = f"custom-{custom_id}"

    for ext, media_type in [
        ('.wav', 'audio/wav'),
        ('.m4a', 'audio/mp4'),
        ('.flac', 'audio/flac'),
        ('.ogg', 'audio/ogg'),
    ]:
        uploads_dir = Path(settings.BASE_DIR) / "static" / "uploads" / "voices" / str(custom_id)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        sample_file = uploads_dir / f"sample{ext}"
        sample_file.write_bytes(b"test content")

        custom_voice = CustomVoice(
            id=custom_id,
            name="Test Voice",
            description="A test custom voice",
            sample_path=str(sample_file.relative_to(settings.BASE_DIR)),
            voice_id=str(sample_file.relative_to(settings.BASE_DIR)),
            language="en",
            is_active=True,
        )

        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.first.return_value = custom_voice
        mock_session.exec.return_value = mock_result

        async def override_get_session():
            yield mock_session

        app.dependency_overrides[get_session] = override_get_session

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get(f"/api/voice-preview/{voice_id}")

            assert response.status_code == 200
            assert response.headers["content-type"] == media_type
        finally:
            app.dependency_overrides.clear()

        # Cleanup
        if sample_file.exists():
            sample_file.unlink()

    try:
        uploads_dir.rmdir()
    except OSError:
        pass


@pytest.mark.asyncio
async def test_voice_preview_edge_tts_caching():
    """Test that Edge-TTS preview is cached after first generation."""
    voice_id = "en-US-JennyNeural"

    # Clear cache for this voice
    import app.api.voice_preview as vp_module
    if voice_id in vp_module._preview_cache:
        del vp_module._preview_cache[voice_id]

    call_count = 0

    async def mock_generate_audio(text, voice_id, output_path):
        nonlocal call_count
        call_count += 1
        output_path.write_bytes(b"generated content")
        return output_path

    with patch("app.api.voice_preview.generate_audio", side_effect=mock_generate_audio):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # First call - should generate
            response1 = await ac.get(f"/api/voice-preview/{voice_id}")
            assert response1.status_code == 200

            # Second call - should use cache
            response2 = await ac.get(f"/api/voice-preview/{voice_id}")
            assert response2.status_code == 200

        # generate_audio should only be called once
        assert call_count == 1

    # Cleanup
    preview_dir = Path(settings.BASE_DIR) / "static" / "outputs" / "previews"
    preview_file = preview_dir / f"{voice_id}_preview.mp3"
    if preview_file.exists():
        preview_file.unlink()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])