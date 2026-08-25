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
      setText(''); // Clear input on success
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

    // Validate file type
    const allowedTypes = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'];
    const fileExt = audioFile.name.toLowerCase().substring(audioFile.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExt)) {
      setError(`Unsupported file format. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size (50MB)
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

      // Create a "virtual" generation for transcribed audio
      const transcriptId = `transcribe-${Date.now()}`;
      const virtualGeneration = {
        id: transcriptId,
        audio_url: '', // We don't serve the uploaded audio
        transcript_url: `/static/outputs/${transcriptId}.json`,
        created_at: new Date().toISOString(),
        voice_id: 'transcribed-audio',
        text: transcript.full_text,
        duration: transcript.duration,
      };

      // Store transcript in sessionStorage
      sessionStorage.setItem(`transcript-${transcriptId}`, JSON.stringify(transcript));
      setCurrent(virtualGeneration as any);
      addToHistory({
        id: transcriptId,
        audio_url: '',
        transcript_url: `/static/outputs/${transcriptId}.json`,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="text-input" className="block text-sm font-medium text-foreground mb-2">
          Text Input
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isGenerating || voicesLoading}
          placeholder="Enter text to convert to speech or generate transcript..."
          className={cn(
            'w-full min-h-[120px] p-4 bg-background border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y text-base leading-relaxed',
            isOverLimit && 'border-destructive'
          )}
          maxLength={maxChars}
          aria-describedby="char-count"
        />
        <div className="flex justify-between items-center mt-2">
          <span
            id="char-count"
            className={cn('text-sm', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}
          >
            {charCount} / {maxChars} characters
          </span>
          {isOverLimit && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>

      {/* Mode Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Generation Mode
        </label>
        <div className="flex flex-wrap gap-4">
          <label className={cn(
            'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
            mode === 'speech'
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-input hover:bg-accent'
          )}>
            <input
              type="radio"
              name="mode"
              value="speech"
              checked={mode === 'speech'}
              onChange={() => setMode('speech')}
              disabled={isGenerating || voicesLoading}
              className="sr-only"
            />
            <Mic className="h-5 w-5" />
            <span className="font-medium">Generate Speech + Transcript</span>
          </label>
          <label className={cn(
            'flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors',
            mode === 'transcribe'
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-input hover:bg-accent'
          )}>
            <input
              type="radio"
              name="mode"
              value="transcribe"
              checked={mode === 'transcribe'}
              onChange={() => setMode('transcribe')}
              disabled={isGenerating || voicesLoading}
              className="sr-only"
            />
            <FileAudio className="h-5 w-5" />
            <span className="font-medium">Transcribe Audio File</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === 'speech'
            ? 'Generates audio using Edge-TTS and creates timestamped transcript'
            : 'Upload an audio file (WAV, MP3, M4A, FLAC, OGG, WebM, AAC) to transcribe with timestamps'}
        </p>
      </div>

      {mode === 'speech' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Voice
          </label>
          {voicesLoading ? (
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
          ) : (
            <VoiceSelector
              value={voiceId}
              onChange={setVoiceId}
              voices={voices}
              disabled={isGenerating}
            />
          )}
        </div>
      )}

      {mode === 'transcribe' && (
        <div>
          <label htmlFor="audio-file" className="block text-sm font-medium text-foreground mb-2">
            Audio File
          </label>
          <div className={cn(
            'flex items-center justify-center w-full',
            isGenerating && 'opacity-50 pointer-events-none'
          )}>
            <label className={cn(
              'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer',
              'border-input hover:bg-accent hover:border-primary/50',
              'transition-colors'
            )}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  WAV, MP3, M4A, FLAC, OGG, WebM, AAC (max 50MB)
                </p>
                {audioFile && (
                  <p className="mt-2 text-sm font-medium text-primary">
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
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
          'w-full py-3 px-6 rounded-lg font-medium text-base transition-colors',
          'flex items-center justify-center gap-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isGenerating
            ? 'bg-primary/50 text-primary-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : mode === 'speech' ? (
          <>
            <Mic className="h-5 w-5" />
            Generate Speech
          </>
        ) : (
          <>
            <FileAudio className="h-5 w-5" />
            Transcribe Audio
          </>
        )}
      </button>
    </form>
  );
}