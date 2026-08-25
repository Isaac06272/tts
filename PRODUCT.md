# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + FastAPI + Python 3.11 + SQLite + SQLModel

## Users

Developers, content creators, accessibility researchers, and anyone needing high-quality TTS with precise word-level timestamps for dubbing, subtitles, or learning tools.

## Product Purpose

A text-to-speech application that generates natural-sounding speech using Microsoft Edge neural voices and produces accurate word-level timestamps via faster-whisper. Enables two workflows: (1) text → speech + transcript, (2) audio file → transcript with sentence-level timestamps. The product exists to make high-quality TTS with precise alignment accessible without cloud dependencies for transcription.

## Positioning

Unlike cloud TTS services that charge per character and lock transcription behind APIs, this runs transcription locally with faster-whisper on your hardware (CPU or GPU), giving you full control, zero marginal cost, and sentence-accurate timestamps from any audio file.

## Operating Context

- Local development or Docker deployment
- Works offline for transcription (Edge-TTS requires internet)
- GPU acceleration via CUDA (NVIDIA) for faster-whisper
- Desktop-first web app; responsive for tablet/mobile

## Capabilities and Constraints

**Capabilities:**
- Text-to-speech with 30+ Edge neural voices
- Real-time word highlighting synced to audio playback
- Persistent generation history (SQLite)
- Transcript copy/download (JSON with timestamps)
- Audio file transcription (WAV, MP3, M4A, FLAC, OGG, WebM, AAC up to 50MB)
- Sentence-level timestamps from uploaded audio
- Keyboard shortcuts for playback control

**Constraints:**
- Edge-TTS requires internet connection
- faster-whisper model loads at startup (~1-2s on GPU)
- Max 20,000 characters per generation
- Audio upload limited to 50MB

## Brand Commitments

Name: "TTS App" (placeholder)
Voice: Technical, precise, utility-first
No established visual identity — greenfield for design

## Evidence on Hand

- Working backend (FastAPI) with `/api/generate`, `/api/transcribe`, `/api/voices`, `/api/history`
- Working frontend (Next.js 14) with generation form, audio player, transcript viewer, history list
- WaveSurfer.js for waveform visualization
- 30 curated voices in `backend/app/data/voices.json`
- Docker Compose for full-stack deployment

## Product Principles

1. **Local-first transcription** — No cloud dependency for speech-to-text; runs on your hardware
2. **Precision over polish** — Accurate timestamps matter more than visual flair
3. **Zero marginal cost** — Once running, unlimited generations/transcriptions
4. **Developer ergonomics** — Clean API, type-safe frontend, keyboard shortcuts
5. **Utility wins** — Features serve the core job: text↔audio with timestamps

## Accessibility & Inclusion

- Keyboard navigation for all controls
- Screen reader compatible (semantic HTML, ARIA labels)
- High contrast mode via Tailwind `dark:` support
- Focus visible states
- Reduced motion respected