# Voice Preview and Custom Voice Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add play preview buttons for each voice in the VoiceSelector dropdown (Generate Speech mode), and add "Add Custom Voice" as a selectable option in the dropdown that navigates to a dedicated custom voice management page/screen.

**Architecture:**
1. **Voice Preview** - Add play/stop buttons next to each Edge-TTS voice and custom voice in the VoiceSelector dropdown. Use the Edge-TTS `/api/voices` endpoint's sample URLs (if available) or generate short preview clips on-demand. For custom voices, use the existing `sample_path` audio file.
2. **Custom Voice Dropdown Entry** - Add an "Add Custom Voice" option at the bottom of the Custom Voices section in the dropdown. When selected, it closes the dropdown and navigates to a dedicated Custom Voice management page (reusing the existing `CustomVoiceManager` component in a new route).
3. **Custom Voice Page** - Create a new route `/custom-voices` that displays the full `CustomVoiceManager` with upload functionality, keeping the VoiceSelector dropdown clean and focused on selection only.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Edge-TTS API, existing `useCustomVoices` hook, `CustomVoiceManager` component.

**Spec:** This plan implements the user's requirements:
- Play preview for each voice in the dropdown (Generate Speech mode only)
- "Add Custom Voice" option in the dropdown (Generate Speech mode only, nowhere else)
- Dedicated page/screen for custom voice management when "Add Custom Voice" is chosen

## Global Constraints

- Only modify files in the Generate Speech mode flow — no changes to Transcribe mode or History view
- Voice previews must be lightweight (short clips, cached, non-blocking)
- Custom Voice management stays in `/custom-voices` route — not a modal
- All TypeScript types must match existing `VoiceInfo` and `CustomVoice` interfaces
- Reuse existing `CustomVoiceManager` and `CustomVoiceUpload` components
- Follow existing code style: `cn()` utility, lucide-react icons, accessibility attributes

---

### Task 1: Add Voice Preview API Endpoint (Backend)

**Files:**
- Create: `backend/app/api/voice_preview.py`
- Modify: `backend/app/main.py:10-20` (register new router)
- Test: `backend/tests/test_voice_preview.py`

**Interfaces:**
- Consumes: `GET /api/voice-preview/{voice_id}` — returns audio stream or pre-signed URL for a short preview clip
- Produces: Audio bytes (MP3) for Edge-TTS voices; existing sample file for custom voices

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_voice_preview.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_voice_preview_edge_tts():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/en-US-AriaNeural")
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 0

@pytest.mark.asyncio
async def test_voice_preview_custom_voice():
    # Custom voice preview uses existing sample file
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/custom/test-uuid")
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"

@pytest.mark.asyncio
async def test_voice_preview_not_found():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/voice-preview/nonexistent-voice")
    assert response.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_voice_preview.py -v`
Expected: FAIL with "No module named 'app.api.voice_preview'" or 404

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/api/voice_preview.py
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.core.config import settings
from app.services.edge_tts import generate_audio
from app.database.session import get_session
from app.database.models import CustomVoice
from sqlmodel import select
from uuid import UUID

router = APIRouter()

VOICES_JSON_PATH = Path(settings.BASE_DIR) / "app" / "data" / "voices.json"

# Cache for generated previews (in-memory, TTL could be added)
_preview_cache = {}

@router.get("/voice-preview/{voice_id}")
async def get_voice_preview(voice_id: str):
    """
    Return a short audio preview for a voice.
    - For Edge-TTS voices: generate a 3-second clip using "Hello, this is a preview."
    - For custom voices: return the uploaded sample file.
    """
    # Handle custom voices (prefix "custom-")
    if voice_id.startswith("custom-"):
        custom_voice_uuid = voice_id.replace("custom-", "")
        async for session in get_session():
            result = await session.exec(
                select(CustomVoice).where(CustomVoice.id == UUID(custom_voice_uuid))
            )
            custom_voice = result.first()
            if not custom_voice or not custom_voice.is_active:
                raise HTTPException(status_code=404, detail="Custom voice not found")
            
            sample_path = settings.BASE_DIR / custom_voice.sample_path
            if not sample_path.exists():
                raise HTTPException(status_code=404, detail="Sample file not found")
            
            return StreamingResponse(
                open(sample_path, "rb"),
                media_type="audio/mpeg",
                headers={"Content-Disposition": f'inline; filename="preview_{custom_voice.name}.mp3"'}
            )
    
    # Handle Edge-TTS voices
    # Load voices.json to validate voice_id exists
    with open(VOICES_JSON_PATH) as f:
        voices_data = json.load(f)
    
    voice_info = next((v for v in voices_data["voices"] if v["id"] == voice_id), None)
    if not voice_info:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    # Check cache first
    if voice_id in _preview_cache:
        cached_path = _preview_cache[voice_id]
        if Path(cached_path).exists():
            return StreamingResponse(
                open(cached_path, "rb"),
                media_type="audio/mpeg",
                headers={"Content-Disposition": f'inline; filename="preview_{voice_id}.mp3"'}
            )
    
    # Generate preview clip (short text for quick generation)
    preview_text = "Hello, this is a preview."
    output_dir = Path(settings.OUTPUT_DIR) / "previews"
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_path = output_dir / f"{voice_id}_preview.mp3"
    
    try:
        await generate_audio(preview_text, voice_id, preview_path)
        _preview_cache[voice_id] = str(preview_path)
        
        return StreamingResponse(
            open(preview_path, "rb"),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'inline; filename="preview_{voice_id}.mp3"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py
# Add import
from app.api import voice_preview

# Add router registration (after other routers)
app.include_router(voice_preview.router, prefix="/api")
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_voice_preview.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/voice_preview.py backend/app/main.py backend/tests/test_voice_preview.py
git commit -m "feat(backend): add voice preview API endpoint for Edge-TTS and custom voices"
```

---

### Task 2: Add Preview Audio Hook (Frontend)

**Files:**
- Create: `frontend/src/hooks/useVoicePreview.ts`
- Test: `frontend/src/hooks/__tests__/useVoicePreview.test.ts`

**Interfaces:**
- Consumes: `voiceId: string` — voice identifier (Edge-TTS ID or `custom-{uuid}`)
- Produces: `{ play: () => Promise<void>, stop: () => void, isPlaying: boolean, loading: boolean }`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/hooks/__tests__/useVoicePreview.test.ts
import { renderHook, act } from '@testing-library/react';
import { useVoicePreview } from '../useVoicePreview';

describe('useVoicePreview', () => {
  it('returns play/stop functions and state', () => {
    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));
    expect(result.current).toHaveProperty('play');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('isPlaying');
    expect(result.current).toHaveProperty('loading');
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('plays and stops preview', async () => {
    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));
    
    await act(async () => {
      await result.current.play();
    });
    
    expect(result.current.isPlaying).toBe(true);
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isPlaying).toBe(false);
  });

  it('stops previous preview when playing new one', async () => {
    const { result, rerender } = renderHook(
      ({ voiceId }) => useVoicePreview(voiceId),
      { initialProps: { voiceId: 'en-US-AriaNeural' } }
    );
    
    await act(async () => {
      await result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);
    
    rerender({ voiceId: 'en-US-GuyNeural' });
    expect(result.current.isPlaying).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=useVoicePreview`
Expected: FAIL with "Cannot find module '@/hooks/useVoicePreview'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/hooks/useVoicePreview.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoicePreviewReturn {
  play: () => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
}

export function useVoicePreview(voiceId: string): UseVoicePreviewReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVoiceIdRef = useRef(voiceId);

  // Clean up when voiceId changes
  useEffect(() => {
    if (currentVoiceIdRef.current !== voiceId) {
      // Stop any playing audio from previous voice
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setIsPlaying(false);
      currentVoiceIdRef.current = voiceId;
    }
  }, [voiceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const play = useCallback(async () => {
    if (isPlaying) {
      // Toggle off if already playing
      stop();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/voice-preview/${voiceId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load preview: ${response.statusText}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play preview');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [voiceId, isPlaying]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying, loading, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=useVoicePreview`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useVoicePreview.ts frontend/src/hooks/__tests__/useVoicePreview.test.ts
git commit -m "feat(frontend): add useVoicePreview hook for voice preview playback"
```

---

### Task 3: Update VoiceSelector with Preview Buttons

**Files:**
- Modify: `frontend/src/components/VoiceSelector.tsx:1-276`
- Test: `frontend/src/components/__tests__/VoiceSelector.test.tsx`

**Interfaces:**
- Consumes: `voices: VoiceInfo[]`, `customVoices: CustomVoice[]`, `value: string`, `onChange: (voiceId: string) => void`
- Produces: Dropdown with play/stop buttons on each voice row, "Add Custom Voice" entry at bottom of Custom Voices section

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/components/__tests__/VoiceSelector.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceSelector } from '../VoiceSelector';
import type { VoiceInfo, CustomVoice } from '@/types';

const mockVoices: VoiceInfo[] = [
  { id: 'en-US-AriaNeural', name: 'Aria', locale: 'en-US', gender: 'Female', style: 'Neural' },
  { id: 'en-US-GuyNeural', name: 'Guy', locale: 'en-US', gender: 'Male', style: 'Neural' },
];

const mockCustomVoices: CustomVoice[] = [
  { id: 'cv-1', name: 'My Voice', description: '', sample_path: '/uploads/voices/cv-1/sample.mp3', voice_id: '/uploads/voices/cv-1/sample.mp3', language: 'en', is_active: true, created_at: '', updated_at: '' },
];

it('renders Edge-TTS voices with play buttons', () => {
  render(<VoiceSelector value="" onChange={jest.fn()} voices={mockVoices} customVoices={[]} />);
  
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  
  expect(screen.getByText('Aria')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /preview aria/i })).toBeInTheDocument();
});

it('renders custom voices with play buttons', () => {
  render(<VoiceSelector value="" onChange={jest.fn()} voices={mockVoices} customVoices={mockCustomVoices} />);
  
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  
  expect(screen.getByText('My Voice')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /preview my voice/i })).toBeInTheDocument();
});

it('shows "Add Custom Voice" option in Custom Voices section', () => {
  render(<VoiceSelector value="" onChange={jest.fn()} voices={mockVoices} customVoices={mockCustomVoices} />);
  
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  
  expect(screen.getByRole('option', { name: /add custom voice/i })).toBeInTheDocument();
});

it('calls onNavigateToCustomVoices when "Add Custom Voice" is selected', () => {
  const onNavigate = jest.fn();
  render(<VoiceSelector value="" onChange={jest.fn()} voices={mockVoices} customVoices={mockCustomVoices} onNavigateToCustomVoices={onNavigate} />);
  
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  fireEvent.click(screen.getByRole('option', { name: /add custom voice/i }));
  
  expect(onNavigate).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=VoiceSelector`
Expected: FAIL — missing `onNavigateToCustomVoices` prop, play buttons not rendered

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/components/VoiceSelector.tsx (key modifications shown)
// Add imports
import { Play, Pause, Plus, Loader2 } from 'lucide-react';
import { useVoicePreview } from '@/hooks/useVoicePreview';
import { useRouter } from 'next/navigation';

// Add new prop to interface
interface VoiceSelectorProps {
  id?: string;
  value: string;
  onChange: (voiceId: string) => void;
  voices: VoiceInfo[];
  customVoices?: CustomVoice[];
  disabled?: boolean;
  className?: string;
  onNavigateToCustomVoices?: () => void;  // NEW
}

// Inside component, add hook for each voice being previewed
// We'll use a map of voiceId -> preview state
const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

// Use the hook for the currently previewed voice
const { play, stop, isPlaying, loading } = useVoicePreview(previewingVoiceId || '');

// Handler for preview button click
const handlePreviewClick = (voiceId: string) => {
  if (previewingVoiceId === voiceId && isPlaying) {
    stop();
    setPreviewingVoiceId(null);
  } else {
    setPreviewingVoiceId(voiceId);
    // play() is called via effect in hook when voiceId changes
  }
};

// In the dropdown render, add preview button to each voice row:

// For Edge-TTS voices (around line 176-210):
{filteredVoices.map((voice) => (
  <button
    key={voice.id}
    type="button"
    onClick={() => { onChange(voice.id); setIsOpen(false); }}
    disabled={disabled}
    role="option"
    aria-selected={value === voice.id}
    className={cn(...)}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium truncate">{voice.name}</span>
        <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
          <Globe className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          {voice.locale}
          {voice.style && (
            <>
              <span aria-hidden="true">·</span>
              <User className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              {voice.style}
            </>
          )}
        </span>
      </div>
      {/* Preview button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handlePreviewClick(voice.id); }}
        disabled={disabled || loading}
        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
        aria-label={previewingVoiceId === voice.id && isPlaying ? `Stop preview of ${voice.name}` : `Preview ${voice.name}`}
      >
        {previewingVoiceId === voice.id && isPlaying ? (
          <Pause className="h-4 w-4 text-accent-cyan" aria-hidden="true" />
        ) : previewingVoiceId === voice.id && loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-fg-dim" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4 text-fg-muted hover:text-fg-primary" aria-hidden="true" />
        )}
      </button>
      {value === voice.id && (
        <span className="text-accent-cyan flex-shrink-0" aria-hidden="true">✓</span>
      )}
    </div>
  </button>
))}

// For Custom Voices (around line 227-261):
{filteredCustomVoices.map((voice) => (
  <button
    key={voice.id}
    type="button"
    onClick={() => { onChange(`custom-${voice.id}`); setIsOpen(false); }}
    disabled={disabled}
    role="option"
    aria-selected={value === `custom-${voice.id}`}
    className={cn(...)}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium truncate">{voice.name}</span>
        <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
          <Mic className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          Custom Voice
          {voice.language && (
            <>
              <span aria-hidden="true">·</span>
              {voice.language.toUpperCase()}
            </>
          )}
        </span>
      </div>
      {/* Preview button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handlePreviewClick(`custom-${voice.id}`); }}
        disabled={disabled || loading}
        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
        aria-label={previewingVoiceId === `custom-${voice.id}` && isPlaying ? `Stop preview of ${voice.name}` : `Preview ${voice.name}`}
      >
        {previewingVoiceId === `custom-${voice.id}` && isPlaying ? (
          <Pause className="h-4 w-4 text-accent-cyan" aria-hidden="true" />
        ) : previewingVoiceId === `custom-${voice.id}` && loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-fg-dim" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4 text-fg-muted hover:text-fg-primary" aria-hidden="true" />
        )}
      </button>
      {value === `custom-${voice.id}` && (
        <span className="text-accent-cyan flex-shrink-0" aria-hidden="true">✓</span>
      )}
    </div>
  </button>
))}

// Add "Add Custom Voice" option at the end of Custom Voices section:
{customVoices && customVoices.length > 0 && (
  <>
    {/* ... existing custom voices ... */}
    
    {/* Add Custom Voice option */}
    <button
      type="button"
      onClick={() => { onNavigateToCustomVoices?.(); setIsOpen(false); }}
      disabled={disabled}
      role="option"
      className={cn(
        'w-full px-4 py-3 text-left transition-all duration-100',
        'hover:bg-accent-warm/10 hover:text-accent-warm',
        'focus-visible:outline-none focus-visible:bg-accent-warm/10 focus-visible:text-accent-warm'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium truncate text-accent-warm flex items-center gap-2">
            <Plus className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Add Custom Voice
          </span>
          <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
            <Mic className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            Create a new cloned voice
          </span>
        </div>
      </div>
    </button>
  </>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=VoiceSelector`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/VoiceSelector.tsx frontend/src/components/__tests__/VoiceSelector.test.tsx
git commit -m "feat(frontend): add voice preview buttons and 'Add Custom Voice' option to VoiceSelector"
```

---

### Task 4: Create Custom Voices Page Route

**Files:**
- Create: `frontend/src/app/custom-voices/page.tsx`
- Create: `frontend/src/app/custom-voices/layout.tsx` (optional, for metadata)
- Modify: `frontend/src/app/layout.tsx` (add link in header/nav if desired — optional)
- Test: `frontend/src/app/custom-voices/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `CustomVoiceManager` component, `useCustomVoices` hook
- Produces: Full-page custom voice management UI at `/custom-voices`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/app/custom-voices/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import CustomVoicesPage from '../page';

it('renders CustomVoiceManager with upload enabled', () => {
  render(<CustomVoicesPage />);
  
  expect(screen.getByText(/custom voices/i)).toBeInTheDocument();
  expect(screen.getByText(/upload a voice sample/i)).toBeInTheDocument();
});

it('shows page title and description', () => {
  render(<CustomVoicesPage />);
  
  expect(screen.getByRole('heading', { name: /custom voices/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=custom-voices/page`
Expected: FAIL — page doesn't exist

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/app/custom-voices/page.tsx
'use client';

import { CustomVoiceManager } from '@/components/CustomVoiceManager';
import { Sparkles, Mic } from 'lucide-react';

export default function CustomVoicesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-warm/15 rounded-lg">
            <Sparkles className="h-6 w-6 text-accent-warm" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-h1 text-accent-warm">Custom Voices</h1>
            <p className="text-fg-muted text-body-lg mt-1">
              Manage your cloned voices for speech generation
            </p>
          </div>
        </div>
      </header>

      {/* Custom Voice Manager */}
      <section aria-labelledby="custom-voices-heading" className="surface-panel p-6 md:p-8">
        <h2 id="custom-voices-heading" className="sr-only">Custom Voices</h2>
        <CustomVoiceManager showUpload={true} />
      </section>

      {/* Empty state helper */}
      <div className="text-center py-8 text-fg-dim border-t border-border-subtle">
        <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
        <p className="text-sm">Custom voices appear in the voice dropdown when generating speech</p>
        <p className="text-caption mt-1">Select "Add Custom Voice" from the voice selector to return here</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=custom-voices/page`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/custom-voices/page.tsx frontend/src/app/custom-voices/__tests__/page.test.tsx
git commit -m "feat(frontend): add /custom-voices page for custom voice management"
```

---

### Task 5: Wire VoiceSelector to Navigate to Custom Voices Page

**Files:**
- Modify: `frontend/src/components/GenerationForm.tsx:1-363`
- Test: `frontend/src/components/__tests__/GenerationForm.test.tsx` (update existing)

**Interfaces:**
- Consumes: `useRouter` from `next/navigation`
- Produces: Navigation to `/custom-voices` when "Add Custom Voice" is selected in dropdown

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/components/__tests__/GenerationForm.test.tsx (add to existing)
it('navigates to /custom-voices when "Add Custom Voice" is selected from dropdown', () => {
  const push = jest.fn();
  jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
  
  render(<GenerationForm />);
  
  // Open voice dropdown
  fireEvent.click(screen.getByRole('button', { name: /voice/i }));
  
  // Click "Add Custom Voice"
  fireEvent.click(screen.getByRole('option', { name: /add custom voice/i }));
  
  expect(push).toHaveBeenCalledWith('/custom-voices');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=GenerationForm`
Expected: FAIL — `onNavigateToCustomVoices` not wired

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/components/GenerationForm.tsx
// Add import
import { useRouter } from 'next/navigation';

// Inside GenerationForm component
const router = useRouter();

const handleNavigateToCustomVoices = () => {
  router.push('/custom-voices');
};

// Pass to VoiceSelector (around line 242-249):
<VoiceSelector
  id="voice-select"
  value={voiceId}
  onChange={setVoiceId}
  voices={voices}
  customVoices={customVoices}
  disabled={isGenerating}
  onNavigateToCustomVoices={handleNavigateToCustomVoices}  // NEW
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=GenerationForm`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/GenerationForm.tsx frontend/src/components/__tests__/GenerationForm.test.tsx
git commit -m "feat(frontend): wire VoiceSelector 'Add Custom Voice' to navigate to /custom-voices page"
```

---

### Task 6: Add Navigation Link Back to Generate Page (Optional Polish)

**Files:**
- Modify: `frontend/src/components/CustomVoiceManager.tsx:1-186`
- Test: `frontend/src/components/__tests__/CustomVoiceManager.test.tsx`

**Interfaces:**
- Consumes: `useRouter` from `next/navigation`
- Produces: "Back to Generate" button/link in CustomVoiceManager header when accessed via dropdown

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/components/__tests__/CustomVoiceManager.test.tsx (add to existing)
it('shows "Back to Generate" link when showBackLink prop is true', () => {
  render(<CustomVoiceManager showBackLink={true} />);
  
  expect(screen.getByRole('link', { name: /back to generate/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=CustomVoiceManager`
Expected: FAIL — `showBackLink` prop not implemented

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/components/CustomVoiceManager.tsx
// Add import
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// Add prop
interface CustomVoiceManagerProps {
  onVoiceSelected?: (voice: CustomVoice) => void;
  selectedVoiceId?: string;
  showUpload?: boolean;
  showBackLink?: boolean;  // NEW
}

// Inside component
const router = useRouter();

// In return, add back link at top (after upload section or before list):
{showBackLink && (
  <button
    onClick={() => router.push('/')}
    className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg-primary transition-colors mb-4"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Back to Generate
  </button>
)}
```

- [ ] **Step 4: Update CustomVoicesPage to pass `showBackLink={true}`**

```tsx
// frontend/src/app/custom-voices/page.tsx
<CustomVoiceManager showUpload={true} showBackLink={true} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=CustomVoiceManager`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CustomVoiceManager.tsx frontend/src/app/custom-voices/page.tsx frontend/src/components/__tests__/CustomVoiceManager.test.tsx
git commit -m "feat(frontend): add back navigation from Custom Voices page to Generate page"
```

---

### Task 7: Integration Testing and Polish

**Files:**
- Test: `frontend/src/__tests__/integration/voice-preview-and-custom-voice.test.tsx` (E2E-style)

**Interfaces:**
- Full flow: Generate page → Voice dropdown → Preview plays → Select "Add Custom Voice" → Navigate to `/custom-voices` → Upload voice → Return to Generate → New voice appears in dropdown

- [ ] **Step 1: Write the failing integration test**

```tsx
// frontend/src/__tests__/integration/voice-preview-and-custom-voice.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '@/app/page';
import CustomVoicesPage from '@/app/custom-voices/page';

it('complete flow: preview voice -> add custom voice -> appears in dropdown', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/custom-voices" element={<CustomVoicesPage />} />
      </Routes>
    </MemoryRouter>
  );
  
  // 1. On Generate page, open voice dropdown
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  
  // 2. Preview an Edge-TTS voice
  const ariaPreviewBtn = screen.getByRole('button', { name: /preview aria/i });
  fireEvent.click(ariaPreviewBtn);
  await waitFor(() => expect(screen.getByRole('button', { name: /stop preview of aria/i })).toBeInTheDocument());
  
  // 3. Click "Add Custom Voice"
  fireEvent.click(screen.getByRole('option', { name: /add custom voice/i }));
  
  // 4. Should navigate to /custom-voices
  await waitFor(() => expect(screen.getByRole('heading', { name: /custom voices/i })).toBeInTheDocument());
  
  // 5. Upload a custom voice (mock the API)
  // ... upload flow ...
  
  // 6. Navigate back to Generate
  fireEvent.click(screen.getByRole('link', { name: /back to generate/i }));
  
  // 7. Open dropdown again - new custom voice should appear
  fireEvent.click(screen.getByRole('button', { name: /select a voice/i }));
  expect(screen.getByText(/my new voice/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run integration test**

Run: `cd frontend && npm test -- --testPathPattern=voice-preview-and-custom-voice`
Expected: PASS (after all previous tasks complete)

- [ ] **Step 3: Manual verification checklist**

- [ ] Backend: `GET /api/voice-preview/en-US-AriaNeural` returns audio
- [ ] Backend: `GET /api/voice-preview/custom/<uuid>` returns sample file
- [ ] Frontend: Voice dropdown shows play button on each Edge-TTS voice
- [ ] Frontend: Clicking play loads and plays preview clip
- [ ] Frontend: Clicking play again stops playback
- [ ] Frontend: Custom voices also have play buttons using their sample
- [ ] Frontend: "Add Custom Voice" option appears at bottom of Custom Voices section
- [ ] Frontend: Clicking "Add Custom Voice" navigates to `/custom-voices`
- [ ] Frontend: `/custom-voices` page shows CustomVoiceManager with upload
- [ ] Frontend: After uploading a voice, returning to Generate shows it in dropdown
- [ ] Frontend: "Back to Generate" link works on `/custom-voices` page
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] Backend tests pass: `cd backend && pytest`
- [ ] Frontend tests pass: `cd frontend && npm test`

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete voice preview and custom voice dropdown integration"
```

---

## Summary of Changes

| Area | Files Changed | Description |
|------|---------------|-------------|
| Backend API | `backend/app/api/voice_preview.py` (new), `backend/app/main.py` | New endpoint `/api/voice-preview/{voice_id}` serving preview audio for Edge-TTS and custom voices |
| Frontend Hooks | `frontend/src/hooks/useVoicePreview.ts` (new) | Hook managing preview audio playback state |
| VoiceSelector | `frontend/src/components/VoiceSelector.tsx` | Added preview buttons on each voice row + "Add Custom Voice" option |
| GenerationForm | `frontend/src/components/GenerationForm.tsx` | Wired navigation callback to `/custom-voices` |
| Custom Voices Page | `frontend/src/app/custom-voices/page.tsx` (new) | Full-page custom voice management UI |
| CustomVoiceManager | `frontend/src/components/CustomVoiceManager.tsx` | Added optional "Back to Generate" link |
| Tests | Multiple test files | Unit and integration tests for all new functionality |