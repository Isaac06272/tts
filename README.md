# TTS App

A text-to-speech application with word-level highlighting using Microsoft Edge-TTS (cloud) and faster-whisper (local).

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python 3.11+
- **TTS**: `edge-tts` (Microsoft Edge neural voices)
- **Transcription**: `faster-whisper` (CPU, int8 quantization)
- **Database**: SQLite via SQLModel
- **Audio Player**: HTML5 + WaveSurfer.js

## Quick Start (Docker Compose)

```bash
# Clone and navigate
cd tts-app

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Start everything
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if needed
npm run dev
```

## Features

- **Text-to-Speech**: Convert text to natural-sounding speech using Microsoft Edge voices
- **Word-level Highlighting**: Real-time word highlighting synchronized with audio playback
- **Voice Selection**: 30 curated voices across multiple English locales
- **History**: Persistent generation history with SQLite
- **Transcript**: Copy full text or download JSON with word timestamps
- **Keyboard Shortcuts**: Space/K (play/pause), ←/→ (seek ±5s), ↑/↓ (volume), M (mute)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate speech from text |
| GET | `/api/history` | List generations (paginated) |
| GET | `/api/history/{id}` | Get generation details |
| DELETE | `/api/history/{id}` | Delete generation |
| GET | `/api/voices` | List available voices |

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import in Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

### Backend → Render / Railway / Fly.io

1. Use the provided `Dockerfile`
2. Set environment variables
3. Ensure persistent volume for `static/outputs/` and `data.db`
4. Set `CORS_ORIGINS` to your Vercel frontend URL

## Project Structure

```
tts-app/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities & API client
│   │   ├── store/         # Zustand state
│   │   └── types/         # TypeScript types
│   └── ...
└── backend/
    ├── app/
    │   ├── api/           # FastAPI routes
    │   ├── core/          # Configuration
    │   ├── database/      # SQLModel + session
    │   ├── schemas/       # Pydantic models
    │   └── services/      # Edge-TTS & Whisper
    └── ...
```

## Generating API Types

After starting the backend, run:

```bash
cd frontend
npm run typegen
```

This generates `src/lib/api.ts` with fully typed API client from the FastAPI OpenAPI spec.

## License

MIT