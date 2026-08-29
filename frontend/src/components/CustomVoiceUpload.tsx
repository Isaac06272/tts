'use client';

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Mic, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { CustomVoice, CustomVoiceCreate } from '@/types';

interface CustomVoiceUploadProps {
  onVoiceAdded: (voice: CustomVoice) => void;
  maxVoices?: number;
  currentCount?: number;
}

export function CustomVoiceUpload({ onVoiceAdded, maxVoices = 10, currentCount = 0 }: CustomVoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const allowedTypes = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.aac'];
  const maxSize = 50 * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(ext)) {
      return `Unsupported format. Allowed: ${allowedTypes.join(', ')}`;
    }
    if (file.size > maxSize) {
      return 'File too large. Maximum 50MB.';
    }
    return null;
  };

  const handleFileSelect = (file: File | null) => {
    setError(null);
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-fill name from filename
    const nameFromFile = file.name.replace(/\.[^/.]+$/, '');
    setName(nameFromFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select an audio file');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a name for this voice');
      return;
    }

    if (currentCount >= maxVoices) {
      setError(`Maximum ${maxVoices} custom voices allowed`);
      return;
    }

    setUploading(true);

    try {
      const voiceData: CustomVoiceCreate = {
        name: name.trim(),
        description: description.trim(),
        language,
      };

      const voice = await api.createCustomVoice(voiceData, selectedFile);
      onVoiceAdded(voice);

      // Reset form
      handleRemoveFile();
      setDescription('');
      setLanguage('en');
    } catch (err) {
      // Provide user-friendly error messages
      let message = 'Upload failed. Please try again.';

      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();

        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          message = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
          message = 'Invalid request. Please check your input and try again.';
        } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          message = 'Authentication required. Please log in and try again.';
        } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
          message = 'You do not have permission to upload custom voices.';
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          message = 'Upload endpoint not found. Please contact support.';
        } else if (errorMessage.includes('413') || errorMessage.includes('payload too large')) {
          message = 'File is too large. Maximum size is 50MB.';
        } else if (errorMessage.includes('422') || errorMessage.includes('unprocessable')) {
          message = 'Invalid file format or corrupted audio file.';
        } else if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
          message = 'Server error. Please try again later.';
        } else if (errorMessage.includes('503') || errorMessage.includes('service unavailable')) {
          message = 'Service temporarily unavailable. Please try again later.';
        } else {
          // Use the original error message if it's descriptive enough
          message = err.message;
        }
      }

      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentCount >= maxVoices && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-300">
          Maximum {maxVoices} custom voices reached. Delete unused voices to add more.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload Area */}
        <div className="relative">
          <label className={cn(
            'flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200',
            isDragging && 'border-accent-warm bg-accent-warm/5',
            uploading && 'opacity-50 pointer-events-none',
            selectedFile && 'border-border-subtle bg-bg-elevated cursor-default'
          )}>
            {selectedFile ? (
              <div className="flex flex-col items-center justify-center w-full h-full p-4">
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Mic className="h-6 w-6 text-accent-cyan flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-caption text-fg-dim">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={uploading}
                    className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <audio controls src={previewUrl!} className="w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <Upload className="h-10 w-10 text-fg-dim" aria-hidden="true" />
                <p className="text-sm text-fg-muted">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-caption text-fg-dim">
                  WAV, MP3, M4A, FLAC, OGG, WebM, AAC (max 50MB, 3-30s recommended)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,.aac,audio/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
              disabled={uploading || !!selectedFile || currentCount >= maxVoices}
              aria-label="Upload voice sample"
            />
          </label>
        </div>

        {/* Voice Details */}
        {selectedFile && (
          <div className="space-y-3 border-t border-border-subtle pt-4">
            <div className="space-y-2">
              <label htmlFor="voice-name" className="text-caption text-fg-dim">Voice Name *</label>
              <input
                id="voice-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Narrator Voice"
                maxLength={100}
                className="input-field"
                disabled={uploading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="voice-description" className="text-caption text-fg-dim">Description (optional)</label>
              <textarea
                id="voice-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this voice..."
                rows={2}
                maxLength={500}
                className="input-field font-sans resize-y"
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="voice-language" className="text-caption text-fg-dim">Language</label>
              <select
                id="voice-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field"
                disabled={uploading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="pl">Polish</option>
                <option value="tr">Turkish</option>
                <option value="ru">Russian</option>
                <option value="nl">Dutch</option>
                <option value="cs">Czech</option>
                <option value="ar">Arabic</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="hu">Hungarian</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !selectedFile || !name.trim() || currentCount >= maxVoices}
          className={cn(
            'w-full py-3 px-6 rounded-lg font-medium transition-all duration-150',
            'flex items-center justify-center gap-2',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            uploading
              ? 'bg-accent-warm/50 text-bg-deep cursor-wait'
              : 'bg-accent-warm text-bg-deep hover:bg-accent-warm-dim active:bg-accent-warm/80'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>Processing Voice...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
              <span>Add Voice</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}