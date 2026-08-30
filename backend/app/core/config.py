from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "TTS App"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data.db"

    # Whisper
    WHISPER_MODEL: str = "tiny"  # tiny, base, small, medium, large-v3
    WHISPER_DEVICE: str = "cuda"  # cpu, cuda (GPU acceleration)
    WHISPER_COMPUTE_TYPE: str = "float16"  # int8, float16, float32 (float16 for GPU)

    # XTTS v2 (Voice Cloning)
    XTTS_DEVICE: str = "cuda"  # cpu, cuda (GPU acceleration)
    XTTS_COMPUTE_TYPE: str = "float16"  # float16, float32 (float16 for GPU)

    # Output
    OUTPUT_DIR: str = "static/outputs"

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    VOICES_FILE: Path = BASE_DIR / "app" / "data" / "voices.json"


settings = Settings()