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