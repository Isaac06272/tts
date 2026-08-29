'use client';

import { useRef, useEffect, useState } from 'react';
import { History, Loader2, Sparkles, Mic, FileAudio, Upload, Copy, Download, FileText, Search, ChevronDown, Globe, User, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Trash2, Clock, Mic2, Star } from 'lucide-react';
import { cn, formatTime, formatDate, copyToClipboard, downloadBlob } from '@/lib/utils';
import { GenerationForm } from '@/components/GenerationForm';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { HistoryList } from '@/components/HistoryList';
import { CustomVoiceManager } from '@/components/CustomVoiceManager';
import { useGenerationStore } from '@/store/useGenerationStore';
import { api } from '@/lib/api';
import type { GenerationDetail, GenerationHistoryItem, TranscriptOutput } from '@/types';

function GenerateView({
  current,
  transcript,
  audioRef,
  isTranscriptOnly,
  handleNewGeneration,
  onViewHistory,
  selectedCustomVoiceId,
  setSelectedCustomVoiceId,
}: {
  current: GenerationDetail | null;
  transcript: TranscriptOutput | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isTranscriptOnly: boolean;
  handleNewGeneration: () => void;
  onViewHistory: () => void;
  selectedCustomVoiceId: string | undefined;
  setSelectedCustomVoiceId: (id: string | undefined) => void;
}) {
  if (!current) return null;

  return (
    <section aria-labelledby="player-heading" className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 id="player-heading" className="text-h3 text-accent-warm">
          {isTranscriptOnly ? 'Transcript' : 'Playback'}
        </h2>
      </header>

      <div className="grid lg:grid-cols-12 gap-6">
        {!isTranscriptOnly && (
          <div className="lg:col-span-8 space-y-6">
            <div className="surface-elevated p-6">
              <AudioPlayer audioUrl={current.audio_url} transcriptUrl={current.transcript_url} />
            </div>

            <div className="surface-elevated p-6">
              <TranscriptViewer
                transcriptUrl={current.transcript_url}
                transcriptData={transcript}
                audioRef={audioRef}
                fullText={current.text}
              />
            </div>
          </div>
        )}

        {isTranscriptOnly && (
          <div className="lg:col-span-12">
            <div className="surface-elevated p-6">
              <TranscriptViewer
                transcriptUrl={current.transcript_url}
                transcriptData={transcript}
                audioRef={audioRef}
                fullText={current.text}
              />
            </div>
          </div>
        )}

        <aside className="lg:col-span-4 space-y-6" aria-label="Generation info">
          <div className="surface-panel p-6">
            <h3 className="text-caption text-fg-dim mb-4">Generation Info</h3>
            <dl className="space-y-4 text-sm">
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                <dt className="text-fg-muted whitespace-nowrap">
                  {isTranscriptOnly ? 'Mode' : 'Voice'}
                </dt>
                <dd className="text-fg-primary font-medium text-right break-all font-mono text-xs">
                  {isTranscriptOnly
                    ? 'Audio Transcription'
                    : current.voice_id.replace('Neural', '')}
                </dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                <dt className="text-fg-muted whitespace-nowrap">Duration</dt>
                <dd className="text-fg-primary font-medium text-right font-mono">
                  {current.duration ? formatTime(current.duration) : '—'}
                </dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                <dt className="text-fg-muted whitespace-nowrap">Created</dt>
                <dd className="text-fg-primary font-medium text-right font-mono">
                  {formatDate(current.created_at)}
                </dd>
              </div>
              {!isTranscriptOnly && current.text && (
                <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                  <dt className="text-fg-muted whitespace-nowrap">Characters</dt>
                  <dd className="text-fg-primary font-medium text-right font-mono">
                    {current.text.length.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="surface-panel p-6 space-y-3">
            <button
              onClick={handleNewGeneration}
              className="w-full btn-primary"
            >
              New Generation
            </button>
            <button
              onClick={onViewHistory}
              className="w-full btn-secondary"
            >
              View History
            </button>
          </div>

                  </aside>
      </div>
    </section>
  );
}

function HistoryView({
  handleNewGeneration,
  onLoadGeneration,
}: {
  handleNewGeneration: () => void;
  onLoadGeneration: (generation: GenerationHistoryItem) => void;
}) {
  return (
    <section aria-labelledby="history-heading" className="max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 id="history-heading" className="text-h1 text-accent-warm">History</h2>
          <p className="text-fg-muted text-body mt-2">Previous generations and transcriptions</p>
        </div>
        <button
          onClick={handleNewGeneration}
          className="btn-primary gap-2"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          New Generation
        </button>
      </header>
      <div className="surface-elevated overflow-hidden">
        <HistoryList onLoadGeneration={onLoadGeneration} />
      </div>
    </section>
  );
}

export default function HomePage() {
  const { current, setCurrent, clearError } = useGenerationStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [transcript, setTranscript] = useState<TranscriptOutput | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'custom-voices'>('generate');
  const [selectedCustomVoiceId, setSelectedCustomVoiceId] = useState<string | undefined>(undefined);

  const isTranscriptOnly = current?.voice_id === 'transcribed-audio' || current?.voice_id === 'transcript-only' || !current?.audio_url;
  // Check if this is a local transcript (old format with transcript- or transcribe- prefix)
  // or a database transcript (voice_id === 'transcribed-audio')
  const isLocalTranscript = current?.id.startsWith('transcript-') || current?.id.startsWith('transcribe-');
  const isDbTranscript = current?.voice_id === 'transcribed-audio';

  useEffect(() => {
    if (!current) {
      setTranscript(null);
      return;
    }

    if (isTranscriptOnly && isLocalTranscript) {
      // Old format: transcript stored in sessionStorage
      try {
        const stored = sessionStorage.getItem(`transcript-${current.id}`);
        if (stored) {
          setTranscript(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load transcript from sessionStorage:', error);
      }
      return;
    }

    if (isTranscriptOnly && isDbTranscript) {
      // New format: transcript from database, fetch from static file
      const fetchTranscript = async () => {
        setTranscriptLoading(true);
        try {
          const data = await api.getTranscript(current.transcript_url);
          setTranscript(data);
        } catch (error) {
          console.error('Failed to fetch transcript:', error);
        } finally {
          setTranscriptLoading(false);
        }
      };
      fetchTranscript();
      return;
    }

    const fetchTranscript = async () => {
      setTranscriptLoading(true);
      try {
        const data = await api.getTranscript(current.transcript_url);
        setTranscript(data);
      } catch (error) {
        console.error('Failed to fetch transcript:', error);
      } finally {
        setTranscriptLoading(false);
      }
    };

    fetchTranscript();
  }, [current, isTranscriptOnly, isLocalTranscript, isDbTranscript]);

  const handleLoadFromHistory = async (generation: GenerationHistoryItem) => {
    clearError();
    setActiveTab('generate');
    try {
      const isLocal = generation.id.startsWith('transcript-') || generation.id.startsWith('transcribe-');
      const isDbTranscript = generation.voice_id === 'transcribed-audio';

      if (isLocal) {
        const stored = sessionStorage.getItem(`transcript-${generation.id}`);
        if (stored) {
          const transcriptData = JSON.parse(stored);
          const virtualGeneration = {
            ...generation,
            text: transcriptData.full_text,
            duration: transcriptData.duration,
          };
          setCurrent(virtualGeneration as any);
          setTranscript(transcriptData);
        }
        return;
      }

      if (isDbTranscript) {
        // For database transcriptions, fetch the full detail
        const detail = await api.getGeneration(generation.id);
        setCurrent(detail);
        // The transcript will be fetched in the useEffect
        return;
      }

      const detail = await api.getGeneration(generation.id);
      setCurrent(detail);
    } catch (error) {
      console.error('Failed to load generation:', error);
    }
  };

  const handleNewGeneration = () => {
    clearError();
    setCurrent(null);
    setTranscript(null);
    setSelectedCustomVoiceId(undefined);
    setActiveTab('generate');
  };

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col">
      {/* Header with Waveform Ribbon */}
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-bg-panel/80">
        {/* Waveform Ribbon */}
        <div className="waveform-ribbon" aria-hidden="true" />

        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-warm/15 rounded-lg">
              <Sparkles className="h-5 w-5 text-accent-warm" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-h3 font-extrabold text-accent-warm">TTS Studio</h1>
              <p className="text-caption text-fg-dim">Edge-TTS + faster-whisper</p>
            </div>
          </div>
          <nav className="flex items-center gap-1" role="tablist" aria-label="Main navigation">
            <button
              role="tab"
              aria-selected={activeTab === 'generate'}
              aria-controls="generate-panel"
              id="generate-tab"
              onClick={() => { setActiveTab('generate'); handleNewGeneration(); }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep',
                activeTab === 'generate'
                  ? 'bg-accent-warm text-bg-deep shadow-[0_0_16px_rgba(212,168,67,0.3)]'
                  : 'text-fg-muted hover:text-fg-primary hover:bg-bg-elevated'
              )}
            >
              Generate
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'history'}
              aria-controls="history-panel"
              id="history-tab"
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep',
                activeTab === 'history'
                  ? 'bg-accent-warm text-bg-deep shadow-[0_0_16px_rgba(212,168,67,0.3)]'
                  : 'text-fg-muted hover:text-fg-primary hover:bg-bg-elevated'
              )}
            >
              <History className="h-4 w-4 mr-1.5 inline-block" aria-hidden="true" />
              History
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'custom-voices'}
              aria-controls="custom-voices-panel"
              id="custom-voices-tab"
              onClick={() => setActiveTab('custom-voices')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep',
                activeTab === 'custom-voices'
                  ? 'bg-accent-warm text-bg-deep shadow-[0_0_16px_rgba(212,168,67,0.3)]'
                  : 'text-fg-muted hover:text-fg-primary hover:bg-bg-elevated'
              )}
            >
              <Mic2 className="h-4 w-4 mr-1.5 inline-block" aria-hidden="true" />
              Custom Voices
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12" role="tabpanel" id={activeTab === 'generate' ? 'generate-panel' : activeTab === 'history' ? 'history-panel' : 'custom-voices-panel'}>
        {activeTab === 'generate' ? (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Generation Form */}
            <section aria-labelledby="generate-heading" className="space-y-6">
              <header>
                <h2 id="generate-heading" className="text-h1 text-accent-warm">
                  {isTranscriptOnly ? 'Transcribe Audio' : 'Generate Speech'}
                </h2>
                <p className="text-fg-muted text-body-lg mt-2">
                  {isTranscriptOnly
                    ? 'Upload an audio file to transcribe with sentence-level timestamps'
                    : 'Convert text to natural-sounding speech with word-level timestamps'}
                </p>
              </header>
              <div className="surface-panel p-6 md:p-8">
                <GenerationForm selectedCustomVoiceId={selectedCustomVoiceId} />
              </div>
            </section>

            <GenerateView
              current={current}
              transcript={transcript}
              audioRef={audioRef}
              isTranscriptOnly={isTranscriptOnly}
              handleNewGeneration={handleNewGeneration}
              onViewHistory={() => setActiveTab('history')}
              selectedCustomVoiceId={selectedCustomVoiceId}
              setSelectedCustomVoiceId={setSelectedCustomVoiceId}
            />
          </div>
        ) : activeTab === 'history' ? (
          <HistoryView
            handleNewGeneration={handleNewGeneration}
            onLoadGeneration={handleLoadFromHistory}
          />
        ) : (
          <CustomVoiceManager showUpload={true} showBackLink={false} />
        )}
      </main>
    </div>
  );
}