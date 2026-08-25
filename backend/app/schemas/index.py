from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List


# Request/Response for Generate
class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    voice_id: str = Field(..., min_length=1)


class GenerateResponse(BaseModel):
    id: UUID
    audio_url: str
    transcript_url: str
    created_at: datetime
    voice_id: str
    text: str


# History
class GenerationHistoryItem(BaseModel):
    id: UUID
    audio_url: str
    transcript_url: str
    created_at: datetime
    voice_id: str
    text_preview: str


class HistoryResponse(BaseModel):
    generations: List[GenerationHistoryItem]
    total: int


class GenerationDetail(BaseModel):
    id: UUID
    audio_url: str
    transcript_url: str
    created_at: datetime
    voice_id: str
    text: str
    duration: float


# Voices
class VoiceInfo(BaseModel):
    id: str
    name: str
    locale: str
    gender: str
    style: Optional[str] = None


class VoicesResponse(BaseModel):
    voices: List[VoiceInfo]


# Transcript (served as static JSON)
class SegmentTimestamp(BaseModel):
    text: str
    start: float
    end: float


class TranscriptOutput(BaseModel):
    segments: List[SegmentTimestamp]
    full_text: str
    duration: float


# Audio file transcription
class TranscribeAudioRequest(BaseModel):
    pass  # File uploaded via multipart/form-data


class TranscribeAudioResponse(BaseModel):
    transcript: TranscriptOutput
    filename: str