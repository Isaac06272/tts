'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { cn, formatTime } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  transcriptUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

export function AudioPlayer({ audioUrl, transcriptUrl, onTimeUpdate, className }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [waveformReady, setWaveformReady] = useState(false);

  // Initialize WaveSurfer for waveform visualization only
  useEffect(() => {
    if (!containerRef.current || wavesurferRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--border-subtle))',
      progressColor: 'hsl(var(--accent-cyan))',
      cursorColor: 'hsl(var(--accent-warm))',
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 96,
      interact: true,
      normalize: true,
      url: audioUrl,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setWaveformReady(true);
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setIsLoading(false);
    });

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl]);

  // Create hidden audio element for playback and sync
  useEffect(() => {
    if (audioRef.current) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(audio.currentTime / audio.duration);
      }
      onTimeUpdate?.(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(0);
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('error', () => {
      setIsLoading(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(time / duration);
    }
  }, [duration]);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(newTime);
  }, [currentTime, duration, seek]);

  const handleVolumeChange = useCallback((value: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Waveform click to seek
  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !duration) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * duration;
    seek(time);
  }, [duration, seek]);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Waveform */}
      <div
        ref={containerRef}
        className="wavesurfer-container cursor-pointer rounded-lg"
        onClick={handleWaveformClick}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') skip(5);
          else if (e.key === 'ArrowLeft') skip(-5);
          else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        }}
      />

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-caption text-fg-muted min-w-[90px] font-mono tabular-nums">
          {formatTime(currentTime)}
        </div>

        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => skip(-5)}
            className="p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            aria-label="Rewind 5 seconds"
            disabled={isLoading}
          >
            <SkipBack className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-accent-warm text-bg-deep hover:bg-accent-warm-dim active:bg-accent-warm/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-warm focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep shadow-[0_0_16px_rgba(212,168,67,0.3)]"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Play className="h-6 w-6 ml-1" aria-hidden="true" />
            )}
          </button>

          <button
            onClick={() => skip(5)}
            className="p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            aria-label="Forward 5 seconds"
            disabled={isLoading}
          >
            <SkipForward className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-caption text-fg-muted min-w-[90px] text-right font-mono tabular-nums">
          {formatTime(duration)}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-28 h-1.5 appearance-none bg-border-subtle rounded-full accent-accent-cyan cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}