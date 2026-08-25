'use client';

import { useEffect } from 'react';
import { Trash2, Play, Clock, Loader2, ChevronLeft, ChevronRight, FileText, Volume2 } from 'lucide-react';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useGenerationStore } from '@/store/useGenerationStore';
import { useGenerations } from '@/hooks/useGenerations';
import type { GenerationHistoryItem } from '@/types';

interface HistoryListProps {
  onLoadGeneration: (generation: GenerationHistoryItem) => void;
  className?: string;
}

export function HistoryList({ onLoadGeneration, className }: HistoryListProps) {
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

  // Load initial history
  useEffect(() => {
    if (history.length === 0 && !isLoadingHistory) {
      fetchHistory(1);
    }
  }, [history.length, isLoadingHistory, fetchHistory]);

  const handleLoad = (generation: GenerationHistoryItem) => {
    onLoadGeneration(generation);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this generation?')) {
      await deleteGeneration(id);
    }
  };

  const isTranscriptOnly = (generation: GenerationHistoryItem) =>
    generation.voice_id === 'transcript-only' || generation.id.startsWith('transcribe-');

  if (isLoadingHistory && history.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 surface-input rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={cn('text-center py-16 text-fg-muted', className)}>
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
        <p className="text-h3 font-medium text-fg-primary">No generations yet</p>
        <p className="text-body mt-2">Generate your first speech or transcribe audio to see it here</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border-subtle', className)}>
      {history.map((generation) => (
        <article
          key={generation.id}
          className="p-4 card-interactive cursor-pointer"
          onClick={() => handleLoad(generation)}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLoad(generation); } }}
          role="button"
          aria-label={`Load generation from ${formatDate(generation.created_at)}`}
        >
          <div className="flex items-start gap-4">
            {/* Icon / Type indicator */}
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              isTranscriptOnly(generation)
                ? 'bg-accent-warm/15 text-accent-warm'
                : 'bg-accent-cyan/15 text-accent-cyan'
            )}>
              {isTranscriptOnly(generation) ? (
                <FileText className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Volume2 className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-fg-primary truncate">
                    {generation.text_preview}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-caption text-fg-dim">
                    <span className="font-mono tabular-nums">{formatDate(generation.created_at)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-input text-[10px] font-medium uppercase tracking-wider">
                      {isTranscriptOnly(generation) ? 'Transcription' : 'Speech'}
                    </span>
                    {!isTranscriptOnly(generation) && generation.voice_id && (
                      <span className="truncate max-w-[150px]">{generation.voice_id.replace('Neural', '')}</span>
                    )}
                  </div>
                </div>
                <Play className="h-5 w-5 text-fg-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleDelete(generation.id, e)}
                className="p-2 rounded-lg text-fg-dim hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
                aria-label={`Delete generation from ${formatDate(generation.created_at)}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>
      ))}

      {/* Load More */}
      {hasMoreHistory && (
        <div className="p-4">
          <button
            onClick={loadMoreHistory}
            disabled={isLoadingHistory}
            className="w-full btn-secondary"
          >
            {isLoadingHistory ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" aria-hidden="true" />
                Loading...
              </>
            ) : (
              `Load more ({history.length} of {historyTotal})`
            )}
          </button>
        </div>
      )}
    </div>
  );
}