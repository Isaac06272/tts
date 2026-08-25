from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.database.session import lifespan_db, engine
from app.api import generate, history, voices


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables, load whisper model
    async with lifespan_db():
        # Ensure output directory exists
        output_dir = Path(settings.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        yield
    # Shutdown handled by lifespan_db


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for audio and transcripts
app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static",
)

# Routers
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(voices.router, prefix="/api", tags=["voices"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "TTS App API", "docs": "/docs"}