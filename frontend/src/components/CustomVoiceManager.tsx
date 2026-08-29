'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Mic, Edit, X, Loader2, Play, Pause, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { CustomVoiceUpload } from './CustomVoiceUpload';
import { useRouter } from 'next/navigation';
import type { CustomVoice } from '@/types';

interface CustomVoiceManagerProps {
  onVoiceSelected?: (voice: CustomVoice) => void;
  selectedVoiceId?: string;
  showUpload?: boolean;
  showBackLink?: boolean;
}

export function CustomVoiceManager({ onVoiceSelected, selectedVoiceId, showUpload = true, showBackLink = false }: CustomVoiceManagerProps) {
  const [voices, setVoices] = useState<CustomVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  const router = useRouter();

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const response = await api.getCustomVoices();
      setVoices(response.voices);
    } catch (error) {
      console.error('Failed to load custom voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voiceId: string) => {
    if (!confirm('Delete this custom voice? This cannot be undone.')) return;

    setDeleting(voiceId);
    try {
      await api.deleteCustomVoice(voiceId);
      setVoices(prev => prev.filter(v => v.id !== voiceId));
    } catch (error) {
      alert('Failed to delete voice');
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = useCallback((voice: CustomVoice) => {
    // Play the original sample
    if (previewing === voice.id) {
      const audio = audioElements[voice.id];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPreviewing(null);
      return;
    }

    // Stop any currently playing
    Object.values(audioElements).forEach(a => { a.pause(); a.currentTime = 0; });

    const audio = new Audio(voice.sample_path);
    setAudioElements(prev => ({ ...prev, [voice.id]: audio }));

    audio.onended = () => setPreviewing(null);
    audio.onerror = () => setPreviewing(null);
    audio.play();
    setPreviewing(voice.id);
  }, [previewing, audioElements]);

  const handleSelect = (voice: CustomVoice) => {
    onVoiceSelected?.(voice);
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 animate-pulse bg-bg-input rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBackLink && (
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Generate
        </button>
      )}
      {showUpload && (
        <CustomVoiceUpload
          onVoiceAdded={(voice) => setVoices(prev => [voice, ...prev])}
          currentCount={voices.length}
        />
      )}

      {voices.length === 0 && !loading && (
        <div className="text-center py-8 text-fg-dim">
          <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm">No custom voices yet</p>
          <p className="text-caption mt-1">Upload a voice sample to get started</p>
        </div>
      )}

      <div className="space-y-2" role="list" aria-label="Custom voices">
        {voices.map(voice => (
          <div
            key={voice.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all duration-150',
              'bg-bg-panel border-border-subtle',
              selectedVoiceId === `custom-${voice.id}` && 'border-accent-warm bg-accent-warm/5',
              !voice.is_active && 'opacity-50'
            )}
            role="listitem"
          >
            <button
              onClick={() => handlePreview(voice)}
              disabled={deleting === voice.id}
              className={cn(
                'p-2 rounded-lg transition-colors flex-shrink-0',
                previewing === voice.id
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-fg-muted hover:text-fg-primary hover:bg-bg-elevated'
              )}
              aria-label={previewing === voice.id ? 'Stop preview' : 'Preview voice sample'}
            >
              {previewing === voice.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{voice.name}</span>
                {selectedVoiceId === `custom-${voice.id}` && (
                  <span className="text-xs px-2 py-0.5 bg-accent-warm/20 text-accent-warm rounded">Selected</span>
                )}
                {!voice.is_active && (
                  <span className="text-xs px-2 py-0.5 bg-fg-dim/20 text-fg-dim rounded">Inactive</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-caption text-fg-dim truncate">
                <span>{voice.language.toUpperCase()}</span>
                <span aria-hidden="true">·</span>
                <span>Sample: {voice.sample_path.split('/').pop()}</span>
              </div>
              {voice.description && (
                <p className="text-caption text-fg-dim truncate mt-1">{voice.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSelect(voice)}
                disabled={deleting === voice.id || selectedVoiceId === `custom-${voice.id}`}
                className={cn(
                  'p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-colors',
                  selectedVoiceId === `custom-${voice.id}` && 'text-accent-warm bg-accent-warm/10'
                )}
                aria-label={selectedVoiceId === `custom-${voice.id}` ? 'Already selected' : 'Select this voice'}
              >
                {selectedVoiceId === `custom-${voice.id}` ? (
                  <span className="text-accent-cyan">✓</span>
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => handleDelete(voice.id)}
                disabled={deleting === voice.id}
                className={cn(
                  'p-2 rounded-lg text-fg-muted hover:text-red-400 hover:bg-red-500/10 transition-colors',
                  deleting === voice.id && 'opacity-50 cursor-wait'
                )}
                aria-label="Delete voice"
              >
                {deleting === voice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}