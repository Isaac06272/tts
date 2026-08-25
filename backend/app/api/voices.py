import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.schemas import VoicesResponse, VoiceInfo

router = APIRouter()


@router.get("/voices", response_model=VoicesResponse)
async def get_voices():
    """Get curated list of available voices."""
    try:
        with open(settings.VOICES_FILE, "r", encoding="utf-8") as f:
            voices_data = json.load(f)
        voices = [VoiceInfo(**v) for v in voices_data]
        return VoicesResponse(voices=voices)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Voices file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid voices file format")