'use client';

import { useEffect, useState, useRef } from 'react';
import { Copy, Download, FileText, Check, Search } from 'lucide-react';
import { cn, copyToClipboard, downloadBlob } from '@/lib/utils';
import { useAudioSync } from '@/hooks/useAudioSync';
import type { SegmentTimestamp, TranscriptOutput } from '@/types';

interface TranscriptViewerProps {
  transcriptUrl?: string;
  transcriptData?: TranscriptOutput | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  fullText?: string;
  className?: string;
}

export function TranscriptViewer({ transcriptUrl, transcriptData, audioRef, fullText, className }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<TranscriptOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Extract timestamp from segment text for audio sync
  const getTimestampFromText = (text: string): number => {
    const match = text.match(/^\[(\d{2}):(\d{2})(?::(\d{2}))?\]/);
    if (match) {
      const hours = parseInt(match[3] || '0', 10);
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  };

  const segmentsWithTimestamps = transcript?.segments.map(s => ({
    ...s,
    startTime: getTimestampFromText(s.text),
    displayText: s.text.replace(/^\[\d{2}:\d{2}(?::\d{2})?\]\s*/, ''),
  })) || [];

  const currentSegmentIndex = useAudioSync({
    words: segmentsWithTimestamps,
    audioRef,
    enabled: !!transcript,
  });

  // Fetch transcript from URL if provided, otherwise use transcriptData
  useEffect(() => {
    if (transcriptData) {
      setTranscript(transcriptData);
      setIsLoading(false);
      return;
    }

    if (!transcriptUrl) {
      setIsLoading(false);
      return;
    }

    const fetchTranscript = async () => {
      try {
        const response = await fetch(transcriptUrl);
        if (!response.ok) throw new Error('Failed to fetch transcript');
        const data = await response.json();
        setTranscript(data);
      } catch (error) {
        console.error('Failed to load transcript:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTranscript();
  }, [transcriptUrl, transcriptData]);

  const handleCopy = async () => {
    if (!transcript) return;
    // Segments already include timestamps in their text
    const formattedText = transcript.segments
      .map(s => s.text)
      .join('\n');
    const success = await copyToClipboard(formattedText);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!transcript) return;
    const jsonStr = JSON.stringify(transcript, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `transcript-${Date.now()}.json`;
    downloadBlob(blob, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const handleCopyFullText = async () => {
    if (!transcript) return;
    // Full text without timestamps
    const success = await copyToClipboard(transcript.full_text);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const filteredSegments = segmentsWithTimestamps.filter(s =>
    s.displayText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-caption text-fg-dim">Transcript</h3>
          <div className="h-5 w-5 animate-pulse surface-input rounded" />
        </div>
        <div className="space-y-3" aria-busy="true" aria-label="Loading transcript">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 surface-input rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!transcript || transcript.segments.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-caption text-fg-dim">Transcript</h3>
        <div className="text-center py-12 text-fg-muted">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="text-lg">No transcript available</p>
          <p className="text-sm mt-1">Generate speech or transcribe audio to see transcript here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-caption text-fg-dim">Transcript</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter segments..."
              className="w-full sm:w-64 pl-10 pr-3 py-2 text-sm surface-input focus:outline-none focus:ring-2 focus:ring-accent-cyan/20 focus:border-accent-cyan placeholder:text-fg-dim"
              aria-label="Filter transcript segments"
            />
          </div>
          <button
            onClick={handleCopyFullText}
            className="btn-secondary gap-2"
            aria-label="Copy full text (without timestamps)"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Copy Text</span>
          </button>
          <button
            onClick={handleCopy}
            className="btn-primary gap-2"
            aria-label={copySuccess ? 'Copied!' : 'Copy with timestamps'}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copySuccess ? (
              <span className="hidden sm:inline text-accent-cyan">Copied!</span>
            ) : (
              <span className="hidden sm:inline">Copy with Timestamps</span>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="btn-secondary gap-2"
            aria-label={downloadSuccess ? 'Downloaded!' : 'Download JSON'}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloadSuccess ? (
              <span className="hidden sm:inline text-accent-cyan">Saved!</span>
            ) : (
              <span className="hidden sm:inline">JSON</span>
            )}
          </button>
        </div>
      </div>

      {/* Segment List */}
      <div
        ref={transcriptRef}
        className="max-h-[500px] overflow-y-auto space-y-2 pr-1"
        role="list"
        aria-label="Transcript segments"
      >
        {filteredSegments.map((segment, index) => (
          <article
            key={`${segment.start}-${index}`}
            className={cn(
              'group relative p-4 rounded-lg border transition-all duration-150',
              'hover:bg-bg-elevated hover:border-accent-warm/30',
              currentSegmentIndex === index
                ? 'bg-accent-warm/5 border-accent-warm/30 ring-1 ring-accent-warm/20'
                : 'bg-bg-panel border-border-subtle'
            )}
            role="listitem"
            aria-current={currentSegmentIndex === index ? 'true' : 'false'}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = segment.startTime;
                  }
                }}
                className="flex-shrink-0 px-3 py-1.5 text-caption font-mono font-medium text-fg-dim hover:text-accent-cyan bg-bg-input rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
                aria-label={`Jump to ${segment.text.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]/)?.[0] || segment.startTime}s`}
                title="Click to seek"
              >
                {segment.text.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]/)?.[0] || '00:00'}
              </button>
              <p className={cn(
                'flex-1 text-body leading-relaxed break-words',
                currentSegmentIndex === index
                  ? 'text-accent-cyan font-medium'
                  : 'text-fg-primary'
              )}>
                {segment.displayText}
              </p>
            </div>
            {/* End time indicator */}
            <div className="absolute right-3 bottom-2 text-caption font-mono text-fg-dim/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {segment.text.match(/^\[\d{2}:\d{2}(?::\d{2})?\]/)?.[0]?.replace(/\[|\]/g, '') || ''}
            </div>
          </article>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-caption text-fg-dim">
        <span>{filteredSegments.length} of {transcript.segments.length} segments</span>
        <span className="font-mono tabular-nums">{transcript.full_text.split(' ').length} words</span>
      </div>
    </div>
  );
}