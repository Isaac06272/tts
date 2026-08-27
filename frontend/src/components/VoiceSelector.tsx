'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Globe, User, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceInfo, CustomVoice } from '@/types';

interface VoiceSelectorProps {
  id?: string;
  value: string;
  onChange: (voiceId: string) => void;
  voices: VoiceInfo[];
  customVoices?: CustomVoice[];
  disabled?: boolean;
  className?: string;
}

export function VoiceSelector({ id, value, onChange, voices, customVoices, disabled, className }: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredVoices = useMemo(() => {
    if (!searchQuery) return voices;
    const query = searchQuery.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.locale.toLowerCase().includes(query) ||
        v.gender.toLowerCase().includes(query) ||
        (v.style?.toLowerCase().includes(query) ?? false)
    );
  }, [voices, searchQuery]);

  const filteredCustomVoices = useMemo(() => {
    if (!customVoices || customVoices.length === 0) return [];
    if (!searchQuery) return customVoices.filter(v => v.is_active);
    const query = searchQuery.toLowerCase();
    return customVoices.filter(
      v => v.is_active && (
        v.name.toLowerCase().includes(query) ||
        v.language.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query)
      )
    );
  }, [customVoices, searchQuery]);

  const selectedVoice = voices.find((v) => v.id === value);
  const selectedCustomVoice = customVoices?.find((v) => `custom-${v.id}` === value);

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
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => { onChange(voice.id); setIsOpen(false); }}
                      disabled={disabled}
                      role="option"
                      aria-selected={value === voice.id}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-all duration-100',
                        'hover:bg-bg-elevated hover:text-fg-primary',
                        'focus-visible:outline-none focus-visible:bg-bg-elevated focus-visible:text-fg-primary',
                        value === voice.id && 'bg-accent-warm/10 text-accent-warm'
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
                        {value === voice.id && (
                          <span className="text-accent-cyan" aria-hidden="true">✓</span>
                        )}
                      </div>
                    </button>
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
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => { onChange(`custom-${voice.id}`); setIsOpen(false); }}
                      disabled={disabled}
                      role="option"
                      aria-selected={value === `custom-${voice.id}`}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-all duration-100',
                        'hover:bg-bg-elevated hover:text-fg-primary',
                        'focus-visible:outline-none focus-visible:bg-bg-elevated focus-visible:text-fg-primary',
                        value === `custom-${voice.id}` && 'bg-accent-warm/10 text-accent-warm'
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
                        {value === `custom-${voice.id}` && (
                          <span className="text-accent-cyan" aria-hidden="true">✓</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
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