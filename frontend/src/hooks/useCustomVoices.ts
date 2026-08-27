import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { CustomVoice } from '@/types';

export function useCustomVoices() {
  const [voices, setVoices] = useState<CustomVoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVoices = useCallback(async () => {
    try {
      const response = await api.getCustomVoices();
      setVoices(response.voices.filter(v => v.is_active));
    } catch (error) {
      console.error('Failed to load custom voices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  return { voices, loading, refreshVoices: loadVoices };
}