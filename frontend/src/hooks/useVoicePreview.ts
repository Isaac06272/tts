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
      setError(null);
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
    // Use ref to check current playing state to avoid stale closure
    if (audioRef.current && !audioRef.current.paused) {
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
  }, [voiceId]);

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