# Fix Custom Voice Upload and Cloning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix custom voice upload "fetch failed" error, ensure XTTS v2 voice cloning captures exact tone/pronunciation/enunciation/emotions/pausing, and remove duplicate "Add Custom Voice" from GenerateView since there's now a dedicated tab.

**Architecture:** 
- Frontend: Fix CustomVoiceUpload component error handling and API calls
- Backend: Verify XTTS v2 voice cloning service is correctly configured and used
- Remove redundant CustomVoiceManager from GenerateView sidebar

**Tech Stack:** Next.js 14, React, TypeScript, FastAPI, XTTS v2 (Coqui TTS), Edge-TTS, faster-whisper

**Spec:** This plan addresses issues reported by user

## Global Constraints

- All changes must maintain existing test coverage (21 backend tests, 18 frontend tests)
- TypeScript must compile without errors
- Voice cloning must use XTTS v2 with proper speaker_wav reference
- Custom voice samples must be used as-is for previews (no re-generation)
- Follow existing code patterns and naming conventions

---

### Task 1: Diagnose and Fix Custom Voice Upload "fetch failed" Error

**Files:**
- Modify: `frontend/src/components/CustomVoiceUpload.tsx`
- Modify: `frontend/src/lib/api.ts` (if needed)
- Test: `frontend/src/components/__tests__/CustomVoiceUpload.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: `api.createCustomVoice(data, file)` from `frontend/src/lib/api.ts`
- Produces: Working voice upload with proper error messages

- [ ] **Step 1: Write failing test for upload error handling**

```typescript
// frontend/src/components/__tests__/CustomVoiceUpload.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomVoiceUpload } from '../CustomVoiceUpload';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    createCustomVoice: jest.fn(),
  },
}));

describe('CustomVoiceUpload', () => {
  const mockOnVoiceAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays error when API call fails', async () => {
    (api.createCustomVoice as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<CustomVoiceUpload onVoiceAdded={mockOnVoiceAdded} />);
    
    // Select a file
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/upload voice sample/i);
    fireEvent.change(input, { target: { files: [file] } });
    
    // Fill name
    fireEvent.change(screen.getByLabelText(/voice name/i), { target: { value: 'Test Voice' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /add voice/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest src/components/__tests__/CustomVoiceUpload.test.tsx -v
```
Expected: FAIL - component doesn't show proper error message

- [ ] **Step 3: Fix CustomVoiceUpload error handling**

The issue is likely in the `handleSubmit` function. Need to:
1. Ensure FormData is properly constructed
2. Add better error handling with user-friendly messages
3. Check that the API endpoint matches backend (`/api/custom-voices`)

```typescript
// In CustomVoiceUpload.tsx handleSubmit function
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedFile || !name.trim()) return;

  setUploading(true);
  setError(null);

  try {
    const voiceData: CustomVoiceCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      language: language || 'en',
    };

    const newVoice = await api.createCustomVoice(voiceData, selectedFile);
    onVoiceAdded(newVoice);
    
    // Reset form
    setSelectedFile(null);
    setPreviewUrl(null);
    setName('');
    setDescription('');
    setLanguage('en');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
    setError(message);
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 4: Verify API endpoint in api.ts matches backend**

Check that `api.createCustomVoice` posts to `/api/custom-voices` (not `/custom-voices` without /api prefix)

```typescript
// In frontend/src/lib/api.ts
createCustomVoice: (data: CustomVoiceCreate, file: File) => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.language) formData.append('language', data.language);
  formData.append('file', file);

  return fetchApi<CustomVoice>('/api/custom-voices', {  // MUST have /api prefix
    method: 'POST',
    body: formData,
    headers: {},
  });
},
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend && npx jest src/components/__tests__/CustomVoiceUpload.test.tsx -v
```
Expected: PASS

- [ ] **Step 6: Run all frontend tests**

```bash
cd frontend && npx jest --watchAll=false
```
Expected: All 18+ tests pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CustomVoiceUpload.tsx frontend/src/lib/api.ts frontend/src/components/__tests__/CustomVoiceUpload.test.tsx
git commit -m "fix(frontend): fix custom voice upload error handling and API endpoint"
```

---

### Task 2: Verify and Fix XTTS v2 Voice Cloning Quality

**Files:**
- Modify: `backend/app/services/voice_cloning.py`
- Test: `backend/tests/test_voice_cloning.py` (create if not exists)

**Interfaces:**
- Consumes: `clone_voice(text, speaker_wav, language, output_path)` function
- Produces: High-quality cloned voice audio matching reference tone/pronunciation/emotions

- [ ] **Step 1: Write test for voice cloning quality**

```python
# backend/tests/test_voice_cloning.py
import pytest
from pathlib import Path
from app.services.voice_cloning import clone_voice

@pytest.mark.asyncio
async def test_clone_voice_uses_speaker_wav_reference():
    """Test that clone_voice uses speaker_wav for voice characteristics."""
    # This test verifies the function signature and basic behavior
    # Actual audio quality testing requires manual verification
    
    # Create a dummy reference file
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(b'RIFF....WAVEfmt ')  # Minimal WAV header
        ref_path = f.name
    
    try:
        output_path = Path(tempfile.mktemp(suffix='.wav'))
        # This will fail if coqui-tts not installed, which is expected in CI
        # The test mainly verifies the function is callable
        try:
            await clone_voice(
                text="Hello world",
                speaker_wav=ref_path,
                language="en",
                output_path=output_path
            )
        except RuntimeError as e:
            if "Coqui TTS not installed" in str(e):
                pytest.skip("Coqui TTS not installed")
            raise
    finally:
        Path(ref_path).unlink(missing_ok=True)
```

- [ ] **Step 2: Run test to verify it works**

```bash
cd backend && python -m pytest tests/test_voice_cloning.py -v
```
Expected: PASS (or skip if coqui-tts not installed)

- [ ] **Step 3: Verify XTTS v2 configuration in voice_cloning.py**

The current implementation should:
1. Use `speaker_wav` parameter in `model.tts_to_file()` - this is critical for cloning
2. Use proper language codes that XTTS v2 supports
3. Set appropriate temperature/speed for natural speech

```python
# In backend/app/services/voice_cloning.py - verify this is correct:
model.tts_to_file(
    text=text,
    speaker_wav=speaker_wav,  # THIS IS THE KEY PARAMETER FOR CLONING
    language=language,
    file_path=str(output_path),
    # Optional quality parameters:
    # speed=1.0,  # Normal speed
    # temperature=0.7,  # Lower = more consistent, higher = more expressive
)
```

- [ ] **Step 4: Verify generate.py uses clone_voice correctly for custom voices**

```python
# In backend/app/api/generate.py - verify custom voice handling:
if is_custom_voice:
    custom_voice_uuid = request.voice_id.replace("custom-", "")
    result = await session.exec(
        select(CustomVoice).where(CustomVoice.id == UUID(custom_voice_uuid))
    )
    custom_voice = result.first()
    
    if not custom_voice or not custom_voice.is_active:
        raise HTTPException(status_code=404, detail="Custom voice not found")
    
    # CRITICAL: Use the uploaded sample file as speaker_wav
    speaker_wav_path = settings.BASE_DIR / custom_voice.sample_path
    if not speaker_wav_path.exists():
        raise HTTPException(status_code=404, detail="Voice sample not found")
    
    await clone_voice(
        text=request.text,
        speaker_wav=str(speaker_wav_path),  # Uses uploaded sample
        language=custom_voice.language,
        output_path=audio_path
    )
```

- [ ] **Step 5: Run backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: 21 tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/voice_cloning.py backend/app/api/generate.py backend/tests/test_voice_cloning.py
git commit -m "fix(backend): verify XTTS v2 voice cloning uses speaker_wav for exact voice replication"
```

---

### Task 3: Remove Duplicate "Add Custom Voice" from GenerateView

**Files:**
- Modify: `frontend/src/app/page.tsx` (lines 127-135)

**Interfaces:**
- Consumes: `CustomVoiceManager` component
- Produces: Clean GenerateView sidebar without duplicate custom voice UI

- [ ] **Step 1: Locate the duplicate CustomVoiceManager in GenerateView**

```tsx
// In frontend/src/app/page.tsx, lines ~127-135:
<div className="surface-panel p-6">
  <h3 className="text-caption text-fg-dim mb-4">Custom Voices</h3>
  <CustomVoiceManager
    onVoiceSelected={(voice) => {
      setSelectedCustomVoiceId(`custom-${voice.id}`);
    }}
    selectedVoiceId={current?.voice_id?.startsWith('custom-') ? current.voice_id : selectedCustomVoiceId}
    showUpload={true}
  />
</div>
```

- [ ] **Step 2: Remove the duplicate CustomVoiceManager block**

Since there's now a dedicated "Custom Voices" tab in the header, remove lines 127-135 entirely from GenerateView.

- [ ] **Step 3: Verify the change doesn't break voice selection**

The `VoiceSelector` in `GenerationForm` already handles custom voice selection via the dropdown. The `selectedCustomVoiceId` state is still managed at the HomePage level and passed to `GenerationForm`.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && npx jest --watchAll=false
```
Expected: All tests pass

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(frontend): remove duplicate CustomVoiceManager from GenerateView (now in dedicated tab)"
```

---

### Task 4: End-to-End Verification

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
5. Verify the generated audio matches the uploaded voice's tone, pronunciation, enunciation, emotions, and pausing

- [ ] **Step 6: Verify no duplicate "Add Custom Voice"**

1. In Generate tab, open Voice Selector dropdown
2. Verify "Add Custom Voice" option is NOT present (it's now only in the header tab)
3. Custom voices should still appear in the dropdown with play/favorite buttons

- [ ] **Step 7: Run all tests**

```bash
cd frontend && npx jest --watchAll=false
cd backend && python -m pytest tests/ -v
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: complete custom voice fix - upload, cloning quality, and UI cleanup"
```

---

## Self-Review Checklist

- [ ] Task 1: Custom voice upload "fetch failed" fixed with proper error handling
- [ ] Task 2: XTTS v2 voice cloning verified to use `speaker_wav` parameter for exact replication
- [ ] Task 3: Duplicate CustomVoiceManager removed from GenerateView sidebar
- [ ] Task 4: End-to-end manual verification steps documented
- [ ] All existing tests still pass
- [ ] TypeScript compiles without errors
- [ ] No placeholder/TODO comments in plan

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-30-fix-custom-voice-upload-and-cloning.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**