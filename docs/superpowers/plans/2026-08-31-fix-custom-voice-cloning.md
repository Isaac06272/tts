# Fix Custom Voice Cloning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix custom voice TTS generation to work properly with GPU acceleration, ensure exact voice replication (tone, pronunciation, enunciation, emotions, pausing), and remove duplicate UI elements.

**Architecture:** 
- Backend: XTTS v2 voice cloning service with GPU acceleration (CUDA PyTorch)
- Frontend: Custom voice upload and selection UI
- GPU: NVIDIA RTX 4050 Laptop GPU now available

**Tech Stack:** Next.js 14, React, TypeScript, FastAPI, XTTS v2 (Coqui TTS), CUDA PyTorch 2.5.1+cu121

**Spec:** User reported issues with custom voice generation hanging/failing

## Global Constraints

- All changes must maintain existing test coverage (29 backend tests, 30 frontend tests)
- TypeScript must compile without errors
- Voice cloning must use XTTS v2 with proper speaker_wav reference on GPU
- Custom voice samples must be used as-is for previews (no re-generation)
- Follow existing code patterns and naming conventions

---

### Task 1: Verify GPU-accelerated Voice Cloning Works End-to-End

**Files:**
- Test: `backend/tests/test_voice_cloning_gpu.py` (create new integration test)
- Verify: `backend/app/services/voice_cloning.py`
- Verify: `backend/app/api/generate.py`

**Interfaces:**
- Consumes: `clone_voice(text, speaker_wav, language, output_path)` function
- Produces: Working GPU-accelerated voice cloning

- [ ] **Step 1: Create integration test for GPU voice cloning**

```python
# backend/tests/test_voice_cloning_gpu.py
"""Integration test for GPU-accelerated voice cloning."""
import pytest
import asyncio
from pathlib import Path
import soundfile as sf
import numpy as np
from app.services.voice_cloning import clone_voice

@pytest.mark.asyncio
async def test_clone_voice_gpu_works():
    """Test that clone_voice works with GPU and produces audio output."""
    # Create a test reference audio (5 seconds, 24000 Hz)
    sr = 24000
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration))
    audio = 0.3 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
    
    # Save reference
    ref_dir = Path("static/uploads/voices/test_gpu_integration")
    ref_dir.mkdir(parents=True, exist_ok=True)
    ref_path = ref_dir / "reference.wav"
    sf.write(str(ref_path), audio, sr)
    
    try:
        output_path = Path("test_gpu_output.mp3")
        
        # This should work on GPU now
        result = await clone_voice(
            text="Hello, this is a GPU test.",
            speaker_wav=str(ref_path),
            language="en",
            output_path=output_path
        )
        
        assert result.exists()
        assert result.stat().st_size > 1000  # At least 1KB
        
        # Cleanup
        result.unlink()
    finally:
        ref_path.unlink(missing_ok=True)
        ref_dir.rmdir()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

- [ ] **Step 2: Run test to verify it passes on GPU**

```bash
cd backend && python -m pytest tests/test_voice_cloning_gpu.py -v
```
Expected: PASS (should complete in ~10-30 seconds on GPU vs minutes on CPU)

- [ ] **Step 3: Verify XTTS model loads on GPU**

```python
# In backend/app/services/voice_cloning.py - verify initialize_xtts() uses CUDA
def initialize_xtts() -> "TTS":
    global _xtts_model
    if not TTS_AVAILABLE:
        raise RuntimeError("Coqui TTS not installed. Install with: pip install coqui-tts")
    if _xtts_model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _xtts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    return _xtts_model
```
Expected: Device should be "cuda" when available

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: 29 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_voice_cloning_gpu.py
git commit -m "test(backend): add GPU integration test for voice cloning"
```

---

### Task 2: Fix Any Remaining Issues in Voice Cloning Pipeline

**Files:**
- Modify: `backend/app/services/voice_cloning.py` (if needed)
- Modify: `backend/app/api/generate.py` (if needed)

**Interfaces:**
- Consumes: Custom voice from database with sample_path
- Produces: Generated audio matching uploaded voice characteristics

- [ ] **Step 1: Verify clone_voice handles all languages supported by XTTS v2**

Check XTTS v2 supported languages in `backend/app/services/voice_cloning.py`:
```python
# XTTS v2 supports: en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh, ja, ko, hu, hi
XTTS_LANGUAGES = {"en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh", "ja", "ko", "hu", "hi"}
```

- [ ] **Step 2: Add language validation in generate.py**

```python
# In generate.py before calling clone_voice:
if custom_voice.language not in XTTS_LANGUAGES:
    raise HTTPException(
        status_code=400,
        detail=f"Language '{custom_voice.language}' not supported by XTTS v2. Supported: {', '.join(XTTS_LANGUAGES)}"
    )
```

- [ ] **Step 3: Add error handling for GPU OOM**

```python
# In clone_voice, catch CUDA OOM and fallback to CPU
try:
    model.tts_to_file(...)
except RuntimeError as e:
    if "out of memory" in str(e).lower() or "cuda" in str(e).lower():
        # Fallback to CPU
        model = model.to("cpu")
        model.tts_to_file(...)
    else:
        raise
```

- [ ] **Step 4: Run all tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/voice_cloning.py backend/app/api/generate.py
git commit -m "fix(backend): add language validation and GPU OOM fallback for voice cloning"
```

---

### Task 3: Verify Frontend Integration Works

**Files:**
- Test: `frontend/src/components/__tests__/CustomVoiceUpload.test.tsx` (verify existing)
- Test: `frontend/src/components/__tests__/VoiceSelector.test.tsx` (verify existing)
- Verify: `frontend/src/app/page.tsx` (Custom Voices tab)

**Interfaces:**
- Consumes: `api.createCustomVoice()` for upload
- Produces: Working custom voice upload and selection

- [ ] **Step 1: Run frontend tests**

```bash
cd frontend && npx jest --watchAll=false
```
Expected: 30 tests pass

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Verify Custom Voices tab is accessible in header**

Check `frontend/src/app/page.tsx` has the tab navigation with "Custom Voices" tab

- [ ] **Step 4: Verify GenerateView no longer has duplicate CustomVoiceManager**

Check that lines 127-135 were removed from `page.tsx`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(frontend): verify custom voices UI integration"
```

---

### Task 4: End-to-End Manual Verification

**Files:**
- Test: Manual verification steps

**Interfaces:**
- Consumes: All previous tasks
- Produces: Working custom voice upload, cloning, and playback

- [ ] **Step 1: Start backend server**

```bash
cd backend && python -m uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test custom voice upload**

1. Navigate to http://localhost:3000
2. Click "Custom Voices" tab in header
3. Upload a voice sample (3-30 seconds WAV/MP3)
4. Verify success message and voice appears in list

- [ ] **Step 4: Test voice preview**

1. In Custom Voices tab, click play button on uploaded voice
2. Verify it plays the EXACT uploaded sample (not regenerated)

- [ ] **Step 5: Test voice cloning in Generate tab**

1. Go to "Generate" tab
2. Select the custom voice from dropdown (shows with mic icon)
3. Enter text: "Hello, this is a test of my custom voice. It should sound exactly like me!"
4. Click Generate
5. Verify the generated audio completes in reasonable time (< 30 seconds on GPU)
6. Verify the generated audio matches the uploaded voice's tone, pronunciation, enunciation, emotions, and pausing

- [ ] **Step 6: Verify no duplicate "Add Custom Voice"**

1. In Generate tab, open Voice Selector dropdown
2. Verify "Add Custom Voice" option is NOT present (it's now only in the header tab)
3. Custom voices should still appear in the dropdown with play/favorite buttons

- [ ] **Step 7: Run all tests**

```bash
cd frontend && npx jest --watchAll=false
cd backend && python -m pytest tests/ -v
```

- [ ] **Step 8: Clean up test files**

```bash
# Remove any test audio files created during testing
find backend/static/uploads/voices -name "test_*" -type d -exec rm -rf {} + 2>/dev/null || true
find backend -name "test_*.mp3" -delete 2>/dev/null || true
find backend -name "*_trimmed_*.wav" -delete 2>/dev/null || true
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: complete custom voice cloning fix with GPU acceleration"
```

---

## Self-Review Checklist

- [ ] Task 1: GPU-accelerated voice cloning verified working
- [ ] Task 2: Language validation and GPU OOM fallback added
- [ ] Task 3: Frontend integration verified
- [ ] Task 4: End-to-end manual verification steps documented
- [ ] All existing tests still pass
- [ ] TypeScript compiles without errors
- [ ] No placeholder/TODO comments in plan

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-31-fix-custom-voice-cloning.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**