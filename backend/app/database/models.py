from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel


class Generation(SQLModel, table=True):
    __tablename__ = "generations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    text: str
    voice_id: str
    audio_path: str
    transcript_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    duration: float


class CustomVoice(SQLModel, table=True):
    __tablename__ = "custom_voices"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=100)
    description: str = Field(default="", max_length=500)
    sample_path: str = Field(max_length=500)
    voice_id: str = Field(max_length=100)
    language: str = Field(default="en", max_length=10)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})