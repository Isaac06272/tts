'use client';

import { useEffect } from 'react';
import { Trash2, Play, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  if (isLoadingHistory && history.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground', className)}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg">No generations yet</p>
        <p className="text-sm mt-1">Generate your first speech to see it here</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">History ({historyTotal})</h2>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preview
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Voice
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
            {history.map((generation) => (
              <tr
                key={generation.id}
                onClick={() => handleLoad(generation)}
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
                  {generation.voice_id.replace('Neural', '')}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(generation.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleLoad(generation)}
                      className={cn(
                        'p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground',
                        'flex items-center gap-1'
                      )}
                      aria-label="Load and play"
                    >
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Load</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(generation.id, e)}
                      className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination / Load more */}
      {hasMoreHistory && (
        <div className="mt-4 text-center">
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
    </div>
  );
}