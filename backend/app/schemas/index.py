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
    generation_id: str


# Custom Voice Schemas
class CustomVoiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    language: str = Field(..., min_length=2, max_length=10)


class CustomVoiceCreate(CustomVoiceBase):
    pass


class CustomVoiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    language: Optional[str] = Field(None, min_length=2, max_length=10)
    is_active: Optional[bool] = None


class CustomVoiceRead(CustomVoiceBase):
    id: UUID
    sample_path: str
    voice_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomVoiceListResponse(BaseModel):
    voices: List[CustomVoiceRead]