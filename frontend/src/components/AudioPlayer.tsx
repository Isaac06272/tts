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
      waveColor: 'hsl(var(--primary))',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      interact: true,
      normalize: true,
      url: audioUrl,
      backend: 'WebAudio', // Use WebAudio backend for better performance
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

    wavesurfer.on('audioprocess', () => {
      const time = wavesurfer.getCurrentTime();
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
      setWaveformReady(false);
    };
  }, [audioUrl, onTimeUpdate]);

  // Create HTML5 audio element for actual playback
  useEffect(() => {
    const audio = new Audio(audioUrl);
    // Assign to ref for external control (e.g., TranscriptViewer)
    audioRef.current = audio;

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));

    audio.volume = isMuted ? 0 : volume;

    // Sync WaveSurfer with audio element
    const wavesurfer = wavesurferRef.current;
    if (wavesurfer) {
      wavesurfer.setMuted(isMuted);
      wavesurfer.setVolume(volume);
    }

    return () => {
      audio.pause();
      audio.src = '';
      // Clear ref on cleanup
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [audioUrl, volume, isMuted]);

  // Sync WaveSurfer with audio element on seek
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    const audio = audioRef.current;
    if (!wavesurfer || !audio) return;

    const handleWaveSurferSeek = (progress: number) => {
      audio.currentTime = progress * audio.duration;
    };

    wavesurfer.on('seek' as any, handleWaveSurferSeek);

    return () => {
      wavesurfer.un('seek' as any, handleWaveSurferSeek);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    const wavesurfer = wavesurferRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      wavesurfer?.pause();
    } else {
      audio.play().catch(console.error);
      wavesurfer?.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const wavesurfer = wavesurferRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    wavesurfer?.seekTo(time / audio.duration);
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    const wavesurfer = wavesurferRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    wavesurfer?.seekTo(audio.currentTime / audio.duration);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audio) audio.volume = vol;
    wavesurferRef.current?.setVolume(vol);
    wavesurferRef.current?.setMuted(vol === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsMuted(!isMuted);
    audio.volume = isMuted ? volume : 0;
    wavesurferRef.current?.setMuted(isMuted);
    wavesurferRef.current?.setVolume(isMuted ? 0 : volume);
  }, [isMuted, volume]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange({ target: { value: String(Math.min(1, volume + 0.1)) } } as any);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange({ target: { value: String(Math.max(0, volume - 0.1)) } } as any);
          break;
        case 'm':
          e.preventDefault();
          handleMuteToggle();
          break;
      }
    },
    [togglePlay, handleSkip, handleVolumeChange, handleMuteToggle, volume]
  );

  return (
    <div
      className={cn('w-full', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Audio player"
    >
      {/* Waveform */}
      <div
        ref={containerRef}
        className={cn(
          'wavesurfer-container relative',
          isLoading && 'animate-pulse'
        )}
        role="img"
        aria-label="Audio waveform"
      >
        {isLoading && !waveformReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-4">
        {/* Time / Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm font-mono text-muted-foreground w-16 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-muted appearance-none rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Seek"
          />
          <span className="text-sm font-mono text-muted-foreground w-16">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(-10)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Skip back 10 seconds"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Skip forward 10 seconds"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-muted appearance-none rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
        <kbd className="px-1.5 py-0.5 bg-muted rounded border">Space/K</kbd> Play/Pause
        <kbd className="px-1.5 py-0.5 bg-muted rounded border">←/→</kbd> Seek ±5s
        <kbd className="px-1.5 py-0.5 bg-muted rounded border">↑/↓</kbd> Volume
        <kbd className="px-1.5 py-0.5 bg-muted rounded border">M</kbd> Mute
      </div>
    </div>
  );
}