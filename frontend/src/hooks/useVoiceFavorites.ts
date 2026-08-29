'use client';

import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'tts-voice-favorites';

export function useVoiceFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed));
        }
      }
    } catch (error) {
      console.error('Failed to load voice favorites:', error);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error('Failed to save voice favorites:', error);
    }
  }, []);

  const toggleFavorite = useCallback((voiceId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(voiceId)) {
        newFavorites.delete(voiceId);
      } else {
        newFavorites.add(voiceId);
      }
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  const isFavorite = useCallback((voiceId: string) => {
    return favorites.has(voiceId);
  }, [favorites]);

  const getFavorites = useCallback(() => {
    return Array.from(favorites);
  }, [favorites]);

  return {
    favorites: mounted ? favorites : new Set(),
    isFavorite,
    toggleFavorite,
    getFavorites,
    mounted,
  };
}