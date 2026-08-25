import { useEffect, useRef, useState, useCallback } from 'react';
import type { SegmentTimestamp } from '@/types';

interface UseAudioSyncOptions {
  words: SegmentTimestamp[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  enabled?: boolean;
}

export function useAudioSync({ words, audioRef, enabled = true }: UseAudioSyncOptions) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  const updateHighlight = useCallback(() => {
    if (!audioRef.current || !enabled || words.length === 0) {
      return;
    }

    const currentTime = audioRef.current.currentTime;

    // Find the current segment
    let foundIndex: number | null = null;

    for (let i = 0; i < words.length; i++) {
      const segment = words[i];
      if (currentTime >= segment.start && currentTime < segment.end) {
        foundIndex = i;
        break;
      }
    }

    // Only update state if index changed
    if (foundIndex !== lastIndexRef.current) {
      lastIndexRef.current = foundIndex;
      setCurrentSegmentIndex(foundIndex);
    }

    // Continue animation loop
    if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
      rafRef.current = requestAnimationFrame(updateHighlight);
    }
  }, [words, audioRef, enabled]);

  const start = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(updateHighlight);
  }, [updateHighlight]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastIndexRef.current = null;
    setCurrentSegmentIndex(null);
  }, []);

  // Start/stop based on audio playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    const handlePlay = () => start();
    const handlePause = () => stop();
    const handleEnded = () => stop();
    const handleTimeUpdate = () => {
      // Fallback in case RAF misses
      if (audio.paused || audio.ended) return;
      if (!rafRef.current) start();
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      stop();
    };
  }, [audioRef, enabled, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return currentSegmentIndex;
}