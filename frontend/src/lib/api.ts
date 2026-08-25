// Auto-generated types will go here after running: npm run typegen
// For now, using manual types from @/types

import type {
  GenerateRequest,
  GenerateResponse,
  TranscriptOnlyRequest,
  TranscriptOutput,
  HistoryResponse,
  GenerationDetail,
  VoicesResponse,
  VoiceInfo,
  TranscribeAudioResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  generate: (data: GenerateRequest) =>
    fetchApi<GenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateTranscriptOnly: (data: TranscriptOnlyRequest) =>
    fetchApi<TranscriptOutput>('/api/transcript', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (page = 1, pageSize = 20) =>
    fetchApi<HistoryResponse>(`/api/history?page=${page}&page_size=${pageSize}`),

  getGeneration: (id: string) =>
    fetchApi<GenerationDetail>(`/api/history/${id}`),

  deleteGeneration: (id: string) =>
    fetchApi<void>(`/api/history/${id}`, { method: 'DELETE' }),

  getVoices: () =>
    fetchApi<VoicesResponse>('/api/voices'),

  getTranscript: async (url: string): Promise<TranscriptOutput> => {
    const response = await fetch(`${API_BASE}${url}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transcript');
    }
    return response.json();
  },

  transcribeAudio: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<TranscribeAudioResponse>('/api/transcribe', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - let browser set it with boundary for multipart
      headers: {},
    });
  },
};