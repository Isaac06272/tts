import { useCallback } from 'react';
import { useGenerationStore } from '@/store/useGenerationStore';
import { api } from '@/lib/api';
import type { GenerationDetail, GenerationHistoryItem } from '@/types';

export function useGenerations() {
  const {
    history,
    isLoadingHistory,
    historyPage,
    historyTotal,
    hasMoreHistory,
    setHistory,
    appendHistory,
    removeFromHistory,
    setLoadingHistory,
    setError,
    clearError,
  } = useGenerationStore();

  const fetchHistory = useCallback(async (page = 1, append = false) => {
    setLoadingHistory(true);
    clearError();
    try {
      const response = await api.getHistory(page);
      if (append) {
        appendHistory(response.generations);
      } else {
        setHistory(response.generations, response.total, page);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  }, [setHistory, appendHistory, setLoadingHistory, setError, clearError]);

  const loadMoreHistory = useCallback(() => {
    if (!isLoadingHistory && hasMoreHistory) {
      fetchHistory(historyPage + 1, true);
    }
  }, [isLoadingHistory, hasMoreHistory, historyPage, fetchHistory]);

  const deleteGeneration = useCallback(async (id: string) => {
    clearError();
    try {
      await api.deleteGeneration(id);
      removeFromHistory(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete generation');
    }
  }, [removeFromHistory, setError, clearError]);

  const loadGeneration = useCallback(async (id: string): Promise<GenerationDetail | null> => {
    clearError();
    try {
      const generation = await api.getGeneration(id);
      return generation;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load generation');
      return null;
    }
  }, [setError, clearError]);

  return {
    history,
    isLoadingHistory,
    historyPage,
    historyTotal,
    hasMoreHistory,
    fetchHistory,
    loadMoreHistory,
    deleteGeneration,
    loadGeneration,
  };
}