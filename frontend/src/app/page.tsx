'use client';

import { useRef, useEffect, useState } from 'react';
import { History, Loader2, Sparkles } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { GenerationForm } from '@/components/GenerationForm';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { HistoryList } from '@/components/HistoryList';
import { useGenerationStore } from '@/store/useGenerationStore';
import { api } from '@/lib/api';
import type { GenerationDetail, GenerationHistoryItem, TranscriptOutput } from '@/types';

export default function HomePage() {
  const { current, setCurrent, clearError } = useGenerationStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [transcript, setTranscript] = useState<TranscriptOutput | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  // Check if current generation is transcript-only (no audio)
  const isTranscriptOnly = current?.voice_id === 'transcript-only' || !current?.audio_url;

  // Check if it's a local transcript (stored in sessionStorage)
  const isLocalTranscript = current?.id.startsWith('transcript-') || current?.id.startsWith('transcribe-');

  // Fetch transcript when generation changes
  useEffect(() => {
    if (!current) {
      setTranscript(null);
      return;
    }

    // For local transcripts (both transcript-only and transcribed audio), read from sessionStorage
    if (isTranscriptOnly && isLocalTranscript) {
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
  }, [current, isTranscriptOnly, isLocalTranscript]);

  const handleLoadFromHistory = async (generation: GenerationHistoryItem) => {
    clearError();
    setActiveTab('generate');
    try {
      // Check if it's a local transcript generation (both transcript-only and transcribed audio)
      const isLocal = generation.id.startsWith('transcript-') || generation.id.startsWith('transcribe-');
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
      const detail = await api.getGeneration(generation.id);
      setCurrent(detail);
    } catch (error) {
      console.error('Failed to load generation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TTS App</h1>
                <p className="text-xs text-muted-foreground">Edge-TTS + faster-whisper</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'history'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <History className="h-4 w-4 inline-block mr-1" />
                History
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'generate' ? (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Generation Form */}
            <section aria-labelledby="generate-heading">
              <h2 id="generate-heading" className="text-2xl font-bold mb-6">
                {isTranscriptOnly ? 'Transcript Generator' : 'Generate Speech'}
              </h2>
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <GenerationForm />
              </div>
            </section>

            {/* Player & Transcript */}
            {current && (
              <section aria-labelledby="player-heading" className="space-y-6">
                <h2 id="player-heading" className="text-2xl font-bold">
                  {isTranscriptOnly ? 'Transcript' : 'Playback'}
                </h2>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Audio Player (only show if not transcript-only) */}
                  {!isTranscriptOnly && (
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <AudioPlayer
                          audioUrl={current.audio_url}
                          transcriptUrl={current.transcript_url}
                        />
                      </div>

                      {/* Transcript */}
                      <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <TranscriptViewer
                          transcriptUrl={current.transcript_url}
                          audioRef={audioRef}
                          fullText={current.text}
                        />
                      </div>
                    </div>
                  )}

                  {/* Transcript-only or Transcript with audio */}
                  {isTranscriptOnly && (
                    <div className="lg:col-span-3">
                      <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <TranscriptViewer
                          transcriptUrl={current.transcript_url}
                          transcriptData={transcript}
                          audioRef={audioRef}
                          fullText={current.text}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info Panel */}
                  <div className={cn('space-y-4', isTranscriptOnly ? 'lg:col-span-3' : '')}>
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold mb-4">Generation Info</h3>
                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">
                            {isTranscriptOnly ? 'Mode' : 'Voice'}
                          </dt>
                          <dd className="font-medium">
                            {isTranscriptOnly
                              ? 'Transcript Only'
                              : current.voice_id.replace('Neural', '')}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Created</dt>
                          <dd className="font-medium">
                            {new Date(current.created_at).toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Duration</dt>
                          <dd className="font-medium">
                            {transcript ? formatTime(transcript.duration) : 'Loading...'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Segments</dt>
                          <dd className="font-medium">
                            {transcript ? transcript.segments.length : 'Loading...'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Characters</dt>
                          <dd className="font-medium">{current.text.length}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Original Text */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold mb-3">Original Text</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {current.text}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Empty State */}
            {!current && (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Enter text and click Generate to get started</p>
                <p className="text-sm mt-1">
                  Choose between generating speech with transcript or transcript only
                </p>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Generation History</h2>
              <button
                onClick={() => setActiveTab('generate')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                ← Back to Generate
              </button>
            </div>
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <HistoryList onLoadGeneration={handleLoadFromHistory} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, FastAPI, Edge-TTS & faster-whisper</p>
        </div>
      </footer>
    </div>
  );
}