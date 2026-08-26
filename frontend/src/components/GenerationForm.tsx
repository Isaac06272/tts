'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Mic, FileAudio, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceSelector } from './VoiceSelector';
import { useGenerationStore } from '@/store/useGenerationStore';
import { api } from '@/lib/api';
import type { VoiceInfo, TranscriptOutput } from '@/types';

export function GenerationForm() {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'speech' | 'transcribe'>('speech');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isGenerating, setGenerating, setCurrent, addToHistory, setError: setStoreError } =
    useGenerationStore();

  // Load voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await api.getVoices();
        setVoices(response.voices);
        if (response.voices.length > 0 && !voiceId) {
          setVoiceId(response.voices[0].id);
        }
      } catch (err) {
        setError('Failed to load voices');
      } finally {
        setVoicesLoading(false);
      }
    };
    loadVoices();
  }, [voiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'transcribe') {
      await handleTranscribeAudio();
      return;
    }

    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    if (mode === 'speech' && !voiceId) {
      setError('Please select a voice');
      return;
    }

    setGenerating(true);
    setError(null);
    setStoreError(null);

    try {
      const response = await api.generate({ text: text.trim(), voice_id: voiceId });
      const generation = {
        id: response.id,
        audio_url: response.audio_url,
        transcript_url: response.transcript_url,
        created_at: response.created_at,
        voice_id: response.voice_id,
        text: response.text,
        duration: 0,
      };
      setCurrent(generation);
      addToHistory({
        id: response.id,
        audio_url: response.audio_url,
        transcript_url: response.transcript_url,
        created_at: response.created_at,
        voice_id: response.voice_id,
        text_preview: response.text.slice(0, 100) + (response.text.length > 100 ? '...' : ''),
      });
      setText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      setStoreError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioFile) {
      setError('Please select an audio file');
      return;
    }

    const allowedTypes = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'];
    const fileExt = audioFile.name.toLowerCase().substring(audioFile.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExt)) {
      setError(`Unsupported file format. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    if (audioFile.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return;
    }

    setGenerating(true);
    setError(null);
    setStoreError(null);

    try {
      const response = await api.transcribeAudio(audioFile);
      const transcript = response.transcript;
      const generationId = response.generation_id;

      const virtualGeneration = {
        id: generationId,
        audio_url: '',
        transcript_url: `/static/outputs/${generationId}.json`,
        created_at: new Date().toISOString(),
        voice_id: 'transcribed-audio',
        text: transcript.full_text,
        duration: transcript.duration,
      };

      sessionStorage.setItem(`transcript-${generationId}`, JSON.stringify(transcript));
      setCurrent(virtualGeneration as any);
      addToHistory({
        id: generationId,
        audio_url: '',
        transcript_url: `/static/outputs/${generationId}.json`,
        created_at: new Date().toISOString(),
        voice_id: 'transcribed-audio',
        text_preview: transcript.full_text.slice(0, 100) + (transcript.full_text.length > 100 ? '...' : ''),
      });

      setAudioFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
      setStoreError(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
  };

  const charCount = text.length;
  const maxChars = 20000;
  const isOverLimit = charCount > maxChars;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm" role="alert">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Mode Selector */}
      <fieldset className="space-y-3">
        <legend className="text-caption text-fg-dim">Mode</legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Generation mode">
          <label className={cn(
            'flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border transition-all duration-150',
            mode === 'speech'
              ? 'bg-accent-warm/10 border-accent-warm text-accent-warm shadow-[0_0_16px_rgba(212,168,67,0.15)]'
              : 'border-border-subtle text-fg-muted hover:text-fg-primary hover:bg-bg-elevated hover:border-fg-dim'
          )}>
            <input
              type="radio"
              name="mode"
              value="speech"
              checked={mode === 'speech'}
              onChange={() => setMode('speech')}
              disabled={isGenerating || voicesLoading}
              className="sr-only"
              aria-label="Generate Speech"
            />
            <Mic className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">Generate Speech</span>
          </label>
          <label className={cn(
            'flex items-center gap-2 cursor-pointer px-4 py-3 rounded-lg border transition-all duration-150',
            mode === 'transcribe'
              ? 'bg-accent-warm/10 border-accent-warm text-accent-warm shadow-[0_0_16px_rgba(212,168,67,0.15)]'
              : 'border-border-subtle text-fg-muted hover:text-fg-primary hover:bg-bg-elevated hover:border-fg-dim'
          )}>
            <input
              type="radio"
              name="mode"
              value="transcribe"
              checked={mode === 'transcribe'}
              onChange={() => setMode('transcribe')}
              disabled={isGenerating || voicesLoading}
              className="sr-only"
              aria-label="Transcribe Audio File"
            />
            <FileAudio className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">Transcribe Audio</span>
          </label>
        </div>
        <p className="text-caption text-fg-dim">
          {mode === 'speech'
            ? 'Generates audio using Edge-TTS and creates timestamped transcript'
            : 'Upload an audio file (WAV, MP3, M4A, FLAC, OGG, WebM, AAC) to transcribe with timestamps'}
        </p>
      </fieldset>

      {/* Voice Selector (Speech mode only) */}
      {mode === 'speech' && (
        <div className="space-y-2">
          <label htmlFor="voice-select" className="text-caption text-fg-dim">Voice</label>
          {voicesLoading ? (
            <div className="h-12 surface-input animate-pulse" aria-busy="true" aria-label="Loading voices" />
          ) : (
            <VoiceSelector
              id="voice-select"
              value={voiceId}
              onChange={setVoiceId}
              voices={voices}
              disabled={isGenerating}
            />
          )}
        </div>
      )}

      {/* File Upload (Transcribe mode only) */}
      {mode === 'transcribe' && (
        <div className="space-y-2">
          <label htmlFor="audio-file" className="text-caption text-fg-dim">Audio File</label>
          <div className={cn('relative', isGenerating && 'opacity-50 pointer-events-none')}>
            <label className={cn(
              'flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer',
              'border-border-subtle hover:bg-bg-elevated hover:border-accent-warm/50',
              'transition-all duration-200'
            )}>
              <div className="flex flex-col items-center justify-center pt-6 pb-8">
                <Upload className="h-10 w-10 mb-3 text-fg-dim" aria-hidden="true" />
                <p className="mb-2 text-sm text-fg-muted">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-caption text-fg-dim">
                  WAV, MP3, M4A, FLAC, OGG, WebM, AAC (max 50MB)
                </p>
                {audioFile && (
                  <p className="mt-3 text-sm font-medium text-accent-warm truncate max-w-[90%] flex items-center gap-2">
                    <FileAudio className="h-4 w-4" aria-hidden="true" />
                    {audioFile.name}
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="audio-file"
                type="file"
                accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,.aac,audio/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isGenerating}
                aria-label="Upload audio file for transcription"
              />
            </label>
          </div>
        </div>
      )}

      {/* Text Input (Speech mode only) */}
      {mode === 'speech' && (
        <div className="space-y-2">
          <label htmlFor="text-input" className="text-caption text-fg-dim">Text to Generate</label>
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to convert to speech (max 20,000 characters)..."
            rows={6}
            className={cn(
              'input-field font-sans resize-y',
              isOverLimit && 'input-field-error',
              isGenerating && 'opacity-50'
            )}
            disabled={isGenerating}
            maxLength={maxChars}
            aria-describedby="char-count"
          />
          <div className="flex justify-between text-caption">
            <span className="text-fg-muted" id="char-count">
              {charCount.toLocaleString()} / {maxChars.toLocaleString()} characters
            </span>
            {isOverLimit && (
              <span className="text-red-400 font-medium">Over limit</span>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          isGenerating ||
          voicesLoading ||
          (mode !== 'transcribe' && (!text.trim() || isOverLimit)) ||
          (mode === 'speech' && !voiceId) ||
          (mode === 'transcribe' && !audioFile)
        }
        className={cn(
          'w-full py-3.5 px-6 rounded-lg font-medium text-base transition-all duration-150',
          'flex items-center justify-center gap-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep',
          isGenerating
            ? 'bg-accent-warm/50 text-bg-deep cursor-wait'
            : 'bg-accent-warm text-bg-deep hover:bg-accent-warm-dim active:bg-accent-warm/80 shadow-[0_0_24px_rgba(212,168,67,0.3)]'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>Generating...</span>
          </>
        ) : mode === 'speech' ? (
          <>
            <Mic className="h-5 w-5" aria-hidden="true" />
            <span>Generate Speech</span>
          </>
        ) : (
          <>
            <FileAudio className="h-5 w-5" aria-hidden="true" />
            <span>Transcribe Audio</span>
          </>
        )}
      </button>
    </form>
  );
}