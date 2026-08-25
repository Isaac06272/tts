import { create } from 'zustand';
import type { GenerationDetail, GenerationHistoryItem } from '@/types';

interface GenerationState {
  current: GenerationDetail | null;
  history: GenerationHistoryItem[];
  isGenerating: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  historyPage: number;
  historyTotal: number;
  hasMoreHistory: boolean;

  setCurrent: (generation: GenerationDetail | null) => void;
  addToHistory: (generation: GenerationHistoryItem) => void;
  setHistory: (generations: GenerationHistoryItem[], total: number, page: number) => void;
  appendHistory: (generations: GenerationHistoryItem[]) => void;
  removeFromHistory: (id: string) => void;
  setGenerating: (generating: boolean) => void;
  setLoadingHistory: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  current: null,
  history: [],
  isGenerating: false,
  isLoadingHistory: false,
  error: null,
  historyPage: 1,
  historyTotal: 0,
  hasMoreHistory: true,

  setCurrent: (generation) => set({ current: generation }),

  addToHistory: (generation) =>
    set((state) => ({
      history: [generation, ...state.history],
      historyTotal: state.historyTotal + 1,
    })),

  setHistory: (generations, total, page) =>
    set({
      history: page === 1 ? generations : [...generations],
      historyTotal: total,
      historyPage: page,
      hasMoreHistory: generations.length > 0 && page * 20 < total,
    }),

  appendHistory: (generations) =>
    set((state) => ({
      history: [...state.history, ...generations],
      historyPage: state.historyPage + 1,
      hasMoreHistory: generations.length === 20,
    })),

  removeFromHistory: (id) =>
    set((state) => ({
      history: state.history.filter((g) => g.id !== id),
      historyTotal: state.historyTotal - 1,
      current: state.current?.id === id ? null : state.current,
    })),

  setGenerating: (generating) => set({ isGenerating: generating }),

  setLoadingHistory: (loading) => set({ isLoadingHistory: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      current: null,
      history: [],
      isGenerating: false,
      isLoadingHistory: false,
      error: null,
      historyPage: 1,
      historyTotal: 0,
      hasMoreHistory: true,
    }),
}));