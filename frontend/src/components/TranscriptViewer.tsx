'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, FileText, Check } from 'lucide-react';
import { cn, formatTime, copyToClipboard, downloadBlob } from '@/lib/utils';
import { useAudioSync } from '@/hooks/useAudioSync';
import type { SegmentTimestamp, TranscriptOutput } from '@/types';

interface TranscriptViewerProps {
  transcriptUrl?: string;
  transcriptData?: TranscriptOutput;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  fullText?: string;
  className?: string;
}

export function TranscriptViewer({ transcriptUrl, transcriptData, audioRef, fullText, className }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<TranscriptOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const currentSegmentIndex = useAudioSync({
    words: transcript?.segments || [],
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
    // Copy in the requested format: [MM:SS] Text
    const formattedText = transcript.segments
      .map(s => `${formatTimestamp(s.start)} ${s.text}`)
      .join('\n');
    const success = await copyToClipboard(formattedText);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!transcript) return;
    const blob = new Blob([JSON.stringify(transcript, null, 2)], {
      type: 'application/json',
    });
    const filename = `transcript-${Date.now()}.json`;
    downloadBlob(blob, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-8 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-full" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
      </div>
    );
  }

  if (!transcript || transcript.segments.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No transcript available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{transcript.segments.length} segments • {formatTime(transcript.duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-input',
              'hover:bg-accent transition-colors',
              copySuccess && 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
            )}
            aria-label="Copy transcript"
          >
            {copySuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Transcript</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-input',
              'hover:bg-accent transition-colors',
              downloadSuccess && 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
            )}
            aria-label="Download transcript as JSON"
          >
            {downloadSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transcript with segment timestamps in requested format: [MM:SS] Text */}
      <div
        className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg min-h-[150px] max-h-[400px] overflow-y-auto font-mono"
        role="region"
        aria-label="Transcript with segment timestamps"
      >
        <div className="space-y-1 leading-relaxed">
          {transcript.segments.map((segment, index) => (
            <div
              key={`${segment.text}-${index}`}
              className={cn(
                'px-3 py-1.5 rounded transition-colors duration-150 cursor-pointer select-none',
                index === currentSegmentIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/50 text-foreground'
              )}
            >
              <span className="text-muted-foreground mr-3 shrink-0">{formatTimestamp(segment.start)}</span>
              <span>{segment.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}