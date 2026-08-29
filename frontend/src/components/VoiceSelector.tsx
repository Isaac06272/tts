'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Globe, User, Mic, Play, Pause, Loader2, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoicePreview } from '@/hooks/useVoicePreview';
import { useVoiceFavorites } from '@/hooks/useVoiceFavorites';
import { useRouter } from 'next/navigation';
import type { VoiceInfo, CustomVoice } from '@/types';

interface VoiceSelectorProps {
  id?: string;
  value: string;
  onChange: (voiceId: string) => void;
  voices: VoiceInfo[];
  customVoices?: CustomVoice[];
  disabled?: boolean;
  className?: string;
  onNavigateToCustomVoices?: () => void;
}

export function VoiceSelector({
  id,
  value,
  onChange,
  voices,
  customVoices,
  disabled,
  className,
  onNavigateToCustomVoices,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const router = useRouter();
  const { isFavorite, toggleFavorite, mounted } = useVoiceFavorites();

  const filteredVoices = useMemo(() => {
    let result = voices;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.locale.toLowerCase().includes(query) ||
          v.gender.toLowerCase().includes(query) ||
          (v.style?.toLowerCase().includes(query) ?? false)
      );
    }
    // Sort: favorites first, then alphabetical by name
    return result.sort((a, b) => {
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [voices, searchQuery, isFavorite]);

  const filteredCustomVoices = useMemo(() => {
    if (!customVoices || customVoices.length === 0) return [];
    let result = customVoices.filter(v => v.is_active);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        v =>
          v.name.toLowerCase().includes(query) ||
          v.language.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query)
      );
    }
    // Sort: favorites first, then alphabetical by name
    return result.sort((a, b) => {
      const aFav = isFavorite(`custom-${a.id}`);
      const bFav = isFavorite(`custom-${b.id}`);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [customVoices, searchQuery, isFavorite]);

  const selectedVoice = voices.find((v) => v.id === value);
  const selectedCustomVoice = customVoices?.find((v) => `custom-${v.id}` === value);

  // Use the voice preview hook for the currently previewed voice
  const { play, stop, isPlaying, loading } = useVoicePreview(previewingVoiceId || '');

  // Auto-play when previewingVoiceId changes
  useEffect(() => {
    if (previewingVoiceId) {
      play();
    }
  }, [previewingVoiceId, play]);

  const handlePreviewClick = (voiceId: string) => {
    if (previewingVoiceId === voiceId && isPlaying) {
      stop();
      setPreviewingVoiceId(null);
    } else {
      setPreviewingVoiceId(voiceId);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleVoiceSelect = (voiceId: string) => {
    onChange(voiceId);
    setIsOpen(false);
  };

  const renderPreviewButton = (voiceId: string, voiceName: string) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handlePreviewClick(voiceId); }}
      disabled={disabled || loading}
      className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
      aria-label={previewingVoiceId === voiceId && isPlaying ? `Stop preview of ${voiceName}` : `Preview ${voiceName}`}
    >
      {previewingVoiceId === voiceId && isPlaying ? (
        <Pause className="h-4 w-4 text-accent-cyan" aria-hidden="true" />
      ) : previewingVoiceId === voiceId && loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-fg-dim" aria-hidden="true" />
      ) : (
        <Play className="h-4 w-4 text-fg-muted hover:text-fg-primary" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 bg-bg-input border border-border-subtle rounded-lg',
          'hover:border-accent-warm/50 transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep',
          'text-left'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select voice"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate text-fg-primary">
              {selectedVoice?.name || selectedCustomVoice?.name || 'Select a voice'}
            </span>
            {(selectedVoice || selectedCustomVoice) && (
              <span className="text-caption text-fg-dim truncate flex items-center gap-1">
                {selectedVoice ? (
                  <>
                    <Globe className="h-3 w-3" aria-hidden="true" />
                    {selectedVoice.locale}
                    {selectedVoice.style && (
                      <>
                        <span aria-hidden="true">·</span>
                        <User className="h-3 w-3" aria-hidden="true" />
                        {selectedVoice.style}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3" aria-hidden="true" />
                    Custom Voice
                    {selectedCustomVoice && (
                      <>
                        <span aria-hidden="true">·</span>
                        {selectedCustomVoice.language.toUpperCase()}
                      </>
                    )}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-fg-dim flex-shrink-0 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full max-h-80 overflow-auto rounded-xl border border-border-subtle bg-bg-panel shadow-[0_16px_48px_-16px_rgba(0,0,0,0.5)] animate-in fade-in-100 zoom-in-95 duration-150"
          role="listbox"
          aria-label="Available voices"
        >
          {/* Search */}
          <div className="p-3 border-b border-border-subtle sticky top-0 bg-bg-panel/95 backdrop-blur">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voices..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-bg-input border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-cyan/20 focus:border-accent-cyan placeholder:text-fg-dim"
                aria-label="Search voices"
                autoFocus
              />
            </div>
          </div>

          {/* Voice List */}
          <div className="py-2" role="presentation">
            {/* Edge-TTS Voices Section */}
            {voices.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-fg-dim uppercase tracking-wider border-b border-border-subtle">
                  Edge-TTS Voices
                </div>
                {filteredVoices.length === 0 ? (
                  <div className="px-4 py-4 text-center text-fg-dim text-sm">
                    No Edge-TTS voices match "{searchQuery}"
                  </div>
                ) : (
                  filteredVoices.map((voice) => (
                    <div
                      key={voice.id}
                      role="option"
                      aria-selected={value === voice.id}
                      onClick={() => handleVoiceSelect(voice.id)}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVoiceSelect(voice.id); } }}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-all duration-100 cursor-pointer',
                        'hover:bg-bg-elevated hover:text-fg-primary',
                        'focus-visible:outline-none focus-visible:bg-bg-elevated focus-visible:text-fg-primary',
                        value === voice.id && 'bg-accent-warm/10 text-accent-warm',
                        disabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{voice.name}</span>
                          <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
                            <Globe className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                            {voice.locale}
                            {voice.style && (
                              <>
                                <span aria-hidden="true">·</span>
                                <User className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                                {voice.style}
                              </>
                            )}
                          </span>
                        </div>
                        {/* Favorite button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(voice.id); }}
                          disabled={disabled}
                          className={cn(
                            'p-1.5 rounded-lg flex-shrink-0 transition-colors',
                            isFavorite(voice.id) ? 'text-amber-400' : 'text-fg-muted hover:text-amber-400'
                          )}
                          aria-label={isFavorite(voice.id) ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                          aria-pressed={isFavorite(voice.id)}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              isFavorite(voice.id) && 'fill-current'
                            )}
                            aria-hidden="true"
                          />
                        </button>
                        {/* Preview button */}
                        {renderPreviewButton(voice.id, voice.name)}
                        {value === voice.id && (
                          <span className="text-accent-cyan flex-shrink-0" aria-hidden="true">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Custom Voices Section */}
            {customVoices && customVoices.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-fg-dim uppercase tracking-wider border-b border-border-subtle">
                  Custom Voices
                </div>
                {filteredCustomVoices.length === 0 ? (
                  <div className="px-4 py-4 text-center text-fg-dim text-sm">
                    No custom voices match "{searchQuery}"
                  </div>
                ) : (
                  filteredCustomVoices.map((voice) => (
                    <div
                      key={voice.id}
                      role="option"
                      aria-selected={value === `custom-${voice.id}`}
                      onClick={() => handleVoiceSelect(`custom-${voice.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVoiceSelect(`custom-${voice.id}`); } }}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-all duration-100 cursor-pointer',
                        'hover:bg-bg-elevated hover:text-fg-primary',
                        'focus-visible:outline-none focus-visible:bg-bg-elevated focus-visible:text-fg-primary',
                        value === `custom-${voice.id}` && 'bg-accent-warm/10 text-accent-warm',
                        disabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{voice.name}</span>
                          <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
                            <Mic className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                            Custom Voice
                            {voice.language && (
                              <>
                                <span aria-hidden="true">·</span>
                                {voice.language.toUpperCase()}
                              </>
                            )}
                          </span>
                        </div>
                        {/* Favorite button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(`custom-${voice.id}`); }}
                          disabled={disabled}
                          className={cn(
                            'p-1.5 rounded-lg flex-shrink-0 transition-colors',
                            isFavorite(`custom-${voice.id}`) ? 'text-amber-400' : 'text-fg-muted hover:text-amber-400'
                          )}
                          aria-label={isFavorite(`custom-${voice.id}`) ? `Remove ${voice.name} from favorites` : `Add ${voice.name} to favorites`}
                          aria-pressed={isFavorite(`custom-${voice.id}`)}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              isFavorite(`custom-${voice.id}`) && 'fill-current'
                            )}
                            aria-hidden="true"
                          />
                        </button>
                        {/* Preview button */}
                        {renderPreviewButton(`custom-${voice.id}`, voice.name)}
                        {value === `custom-${voice.id}` && (
                          <span className="text-accent-cyan flex-shrink-0" aria-hidden="true">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Add Custom Voice Option */}
                <div
                  role="option"
                  onClick={() => { onNavigateToCustomVoices?.(); setIsOpen(false); }}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToCustomVoices?.(); setIsOpen(false); } }}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-all duration-100 cursor-pointer',
                    'hover:bg-accent-warm/10 hover:text-accent-warm',
                    'focus-visible:outline-none focus-visible:bg-accent-warm/10 focus-visible:text-accent-warm',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate text-accent-warm flex items-center gap-2">
                        <Plus className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        Add Custom Voice
                      </span>
                      <span className="text-caption text-fg-dim flex items-center gap-1 truncate">
                        <Mic className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                        Create a new cloned voice
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {voices.length === 0 && (!customVoices || customVoices.length === 0) && (
              <div className="px-4 py-8 text-center text-fg-dim text-sm">
                No voices available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}