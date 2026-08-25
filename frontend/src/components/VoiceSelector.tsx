'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Search, Globe, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceInfo } from '@/types';

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  voices: VoiceInfo[];
  disabled?: boolean;
  className?: string;
}

export function VoiceSelector({ value, onChange, voices, disabled, className }: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const selectedVoice = voices.find((v) => v.id === value);

  return (
    <div className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 bg-background border border-input rounded-lg',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'text-left transition-colors'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">
              {selectedVoice?.name || 'Select a voice'}
            </span>
            {selectedVoice && (
              <span className="text-xs text-muted-foreground truncate">
                {selectedVoice.locale} • {selectedVoice.gender}
                {selectedVoice.style && ` • ${selectedVoice.style}`}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-20 mt-1 max-h-60 overflow-auto bg-popover border border-input rounded-lg shadow-lg w-full">
            <div className="p-2 border-b border-input">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>
            </div>
            <ul role="listbox" aria-label="Available voices">
              {filteredVoices.map((voice) => (
                <li key={voice.id} role="option" aria-selected={voice.id === value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(voice.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    disabled={disabled}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      'hover:bg-accent focus:outline-none focus:bg-accent',
                      voice.id === value && 'bg-primary/10 text-primary',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{voice.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {voice.locale} • {voice.gender}
                          {voice.style && ` • ${voice.style}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        <Globe className="h-3.5 w-3.5" />
                        <span>{voice.locale}</span>
                        <User className="h-3.5 w-3.5" />
                        <span>{voice.gender}</span>
                        {voice.style && (
                          <>
                            <span className="px-1.5 py-0.5 bg-secondary rounded text-xs">
                              {voice.style}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filteredVoices.length === 0 && (
                <li className="px-4 py-3 text-center text-muted-foreground text-sm">
                  No voices found
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}