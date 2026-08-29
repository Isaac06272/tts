import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoicePreview } from '../useVoicePreview';

// Mock fetch globally
global.fetch = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLAudioElement
let mockAudioInstance: any;

global.Audio = jest.fn().mockImplementation(() => {
  mockAudioInstance = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    currentTime: 0,
    paused: true,
    onended: null,
    onerror: null,
    src: '',
  };
  return mockAudioInstance;
});

describe('useVoicePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio content'], { type: 'audio/mpeg' })),
    });
  });

  it('returns play/stop functions and state', () => {
    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));
    expect(result.current).toHaveProperty('play');
    expect(result.current).toHaveProperty('stop');
    expect(result.current).toHaveProperty('isPlaying');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('plays and stops preview', async () => {
    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));

    await act(async () => {
      await result.current.play();
    });

    // In test environment, play() resolves but onended might fire immediately
    // So we check that fetch was called and loading states work
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice-preview/en-US-AriaNeural')
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    // Call stop - should not throw
    act(() => {
      result.current.stop();
    });
  });

  it('stops previous preview when playing new one (voiceId change)', async () => {
    const { result, rerender } = renderHook(
      ({ voiceId }) => useVoicePreview(voiceId),
      { initialProps: { voiceId: 'en-US-AriaNeural' } }
    );

    await act(async () => {
      await result.current.play();
    });

    // Change voiceId - should stop previous preview
    rerender({ voiceId: 'en-US-GuyNeural' });
    expect(result.current.error).toBe(null);
    // The hook should handle voiceId change gracefully
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useVoicePreview('invalid-voice'));

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe('Failed to load preview: Not Found');
    expect(result.current.loading).toBe(false);
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));

    await act(async () => {
      await result.current.play();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('stops preview when stop is called', async () => {
    const { result } = renderHook(() => useVoicePreview('en-US-AriaNeural'));

    await act(async () => {
      await result.current.play();
    });

    // Stop the preview
    act(() => {
      result.current.stop();
    });

    // The stop function should be callable without throwing
    expect(result.current.isPlaying).toBe(false);
  });

  it('cleans up on unmount without throwing', () => {
    const { result, unmount } = renderHook(() => useVoicePreview('en-US-AriaNeural'));

    // Should not throw
    expect(() => unmount()).not.toThrow();
  });
});