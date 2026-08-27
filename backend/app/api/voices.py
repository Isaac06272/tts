import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.core.config import settings
from app.database.session import get_session
from app.database.models import CustomVoice
from app.schemas import VoicesResponse, VoiceInfo

router = APIRouter()


@router.get("/voices", response_model=VoicesResponse)
async def get_voices(
    session: AsyncSession = Depends(get_session),
):
    """Get all available voices (Edge-TTS + Custom)."""
    try:
        # Load Edge-TTS voices from JSON
        with open(settings.VOICES_FILE, "r", encoding="utf-8") as f:
            voices_data = json.load(f)
        edge_voices = [VoiceInfo(**v) for v in voices_data]

        # Load custom voices from database
        result = await session.exec(
            select(CustomVoice).where(CustomVoice.is_active == True)
        )
        custom_voices_db = result.all()

        # Convert custom voices to VoiceInfo format
        custom_voices = [
            VoiceInfo(
                id=f"custom-{cv.id}",
                name=cv.name,
                locale=cv.language.upper(),
                gender="Custom",
                style=cv.description or "Custom voice"
            )
            for cv in custom_voices_db
        ]

        # Combine: custom voices first, then Edge-TTS
        all_voices = custom_voices + edge_voices

        return VoicesResponse(voices=all_voices)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Voices file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid voices file format")