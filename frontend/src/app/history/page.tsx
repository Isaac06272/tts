'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Loader2, Volume2, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useGenerationStore } from '@/store/useGenerationStore';
import { useGenerations } from '@/hooks/useGenerations';
import { api } from '@/lib/api';
import type { GenerationHistoryItem } from '@/types';

type HistoryFilter = 'all' | 'speech' | 'transcription';

export default function HistoryPage() {
  const {
    history,
    isLoadingHistory,
    historyTotal,
    hasMoreHistory,
    historyPage,
    fetchHistory,
    loadMoreHistory,
    deleteGeneration,
  } = useGenerations();

  const [filter, setFilter] = useState<HistoryFilter>('all');

  useEffect(() => {
    if (history.length === 0 && !isLoadingHistory) {
      fetchHistory(1);
    }
  }, [history.length, isLoadingHistory, fetchHistory]);

  const isTranscriptOnly = (generation: GenerationHistoryItem) =>
    generation.voice_id === 'transcript-only' ||
    generation.voice_id === 'transcribed-audio' ||
    generation.id.startsWith('transcribe-') ||
    generation.id.startsWith('transcript-');

  const filteredHistory = history.filter((generation) => {
    if (filter === 'all') return true;
    if (filter === 'speech') return !isTranscriptOnly(generation);
    if (filter === 'transcription') return isTranscriptOnly(generation);
    return true;
  });

  const handleLoadGeneration = async (generation: GenerationHistoryItem) => {
    try {
      // Check if it's a local transcript-only generation (old format)
      if (generation.voice_id === 'transcript-only' || generation.id.startsWith('transcript-') || generation.id.startsWith('transcribe-')) {
        const stored = sessionStorage.getItem(`transcript-${generation.id}`);
        if (stored) {
          const transcriptData = JSON.parse(stored);
          const virtualGeneration = {
            ...generation,
            text: transcriptData.full_text,
            duration: transcriptData.duration,
          };
          useGenerationStore.getState().setCurrent(virtualGeneration as any);
          window.location.href = '/';
        }
        return;
      }
      // Check if it's a database transcription
      if (generation.voice_id === 'transcribed-audio') {
        const detail = await api.getGeneration(generation.id);
        useGenerationStore.getState().setCurrent(detail);
        window.location.href = '/';
        return;
      }
      const detail = await api.getGeneration(generation.id);
      useGenerationStore.getState().setCurrent(detail);
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to load generation:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Delete this generation?')) {
      await deleteGeneration(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Generate</span>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Generation History</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-muted-foreground">{historyTotal} generation{historyTotal !== 1 ? 's' : ''} total</p>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            {isLoadingHistory && history.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">
                  {filter === 'all' ? 'No generations yet' : filter === 'speech' ? 'No speech generations' : 'No transcriptions'}
                </p>
                <p className="text-sm mt-1">
                  {filter === 'all'
                    ? 'Generate your first speech or transcribe audio to see it here'
                    : filter === 'speech'
                    ? 'Generate speech to see it here'
                    : 'Transcribe audio to see it here'}
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {filter === 'transcription' ? 'Transcribe Audio' : 'Generate Speech'}
                </Link>
              </div>
            ) : (
              <>
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 p-1 surface-input rounded-lg">
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-all',
                      filter === 'all'
                        ? 'bg-accent-warm text-bg-deep shadow-sm'
                        : 'text-fg-muted hover:text-fg-primary'
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('speech')}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                      filter === 'speech'
                        ? 'bg-accent-cyan text-bg-deep shadow-sm'
                        : 'text-fg-muted hover:text-fg-primary'
                    )}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    Speech
                  </button>
                  <button
                    onClick={() => setFilter('transcription')}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                      filter === 'transcription'
                        ? 'bg-accent-warm text-bg-deep shadow-sm'
                        : 'text-fg-muted hover:text-fg-primary'
                    )}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Transcriptions
                  </button>
                </div>

                {/* Results Count */}
                <p className="text-caption text-fg-dim mb-3">
                  Showing {filteredHistory.length} of {history.length} {history.length === 1 ? 'generation' : 'generations'}
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Preview
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Mode
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredHistory.map((generation) => (
                        <tr
                          key={generation.id}
                          onClick={() => handleLoadGeneration(generation)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            'hover:bg-accent/50',
                            'last:border-b-0'
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="max-w-xs truncate text-sm font-medium">{generation.text_preview}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>~{Math.ceil((generation.text_preview.length / 150) * 60)}s</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {generation.voice_id === 'transcript-only' || generation.voice_id === 'transcribed-audio' || generation.id.startsWith('transcript-') || generation.id.startsWith('transcribe-')
                              ? 'Transcript Only'
                              : generation.voice_id.replace('Neural', '')}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(generation.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href="/"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleLoadGeneration(generation);
                                }}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                                )}
                              >
                                Load
                              </Link>
                              <button
                                onClick={(e) => handleDelete(generation.id, e)}
                                className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                                aria-label="Delete"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v12m-6 0h14m0 0l.003-12H5.003l.003 12z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMoreHistory && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreHistory}
                      disabled={isLoadingHistory}
                      className={cn(
                        'px-6 py-2 rounded-lg border border-input text-sm font-medium',
                        'hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isLoadingHistory ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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