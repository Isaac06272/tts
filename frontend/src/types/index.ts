export interface VoiceInfo {
  id: string;
  name: string;
  locale: string;
  gender: 'Female' | 'Male';
  style?: string;
}

export interface VoicesResponse {
  voices: VoiceInfo[];
}

export interface SegmentTimestamp {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptOutput {
  segments: SegmentTimestamp[];
  full_text: string;
  duration: number;
}

export interface GenerateRequest {
  text: string;
  voice_id: string;
}

export interface TranscriptOnlyRequest {
  text: string;
}

export interface TranscribeAudioResponse {
  transcript: TranscriptOutput;
  filename: string;
  generation_id: string;
}

export interface CustomVoice {
  id: string;
  name: string;
  description: string;
  sample_path: string;
  voice_id: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomVoiceCreate {
  name: string;
  description?: string;
  language?: string;
}

export interface CustomVoiceUpdate {
  name?: string;
  description?: string;
  language?: string;
  is_active?: boolean;
}

export interface CustomVoiceListResponse {
  voices: CustomVoice[];
}

export interface GenerateResponse {
  id: string;
  audio_url: string;
  transcript_url: string;
  created_at: string;
  voice_id: string;
  text: string;
}

export interface GenerationHistoryItem {
  id: string;
  audio_url: string;
  transcript_url: string;
  created_at: string;
  voice_id: string;
  text_preview: string;
}

export interface HistoryResponse {
  generations: GenerationHistoryItem[];
  total: number;
}

export interface GenerationDetail {
  id: string;
  audio_url: string;
  transcript_url: string;
  created_at: string;
  voice_id: string;
  text: string;
  duration: number;
}