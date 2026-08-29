import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceSelector } from '../VoiceSelector';
import type { VoiceInfo, CustomVoice } from '@/types';

// Mock useVoicePreview hook
jest.mock('@/hooks/useVoicePreview', () => ({
  useVoicePreview: jest.fn(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    isPlaying: false,
    loading: false,
    error: null,
  })),
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockVoices: VoiceInfo[] = [
  { id: 'en-US-AriaNeural', name: 'Aria', locale: 'en-US', gender: 'Female', style: 'Neural' },
  { id: 'en-US-GuyNeural', name: 'Guy', locale: 'en-US', gender: 'Male', style: 'Neural' },
];

const mockCustomVoices: CustomVoice[] = [
  {
    id: 'cv-1',
    name: 'My Voice',
    description: 'A test voice',
    sample_path: '/uploads/voices/cv-1/sample.mp3',
    voice_id: '/uploads/voices/cv-1/sample.mp3',
    language: 'en',
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

describe('VoiceSelector', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    voices: mockVoices,
    customVoices: mockCustomVoices,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Edge-TTS voices with play buttons', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    expect(screen.getByText('Aria')).toBeInTheDocument();
    expect(screen.getByText('Guy')).toBeInTheDocument();
    // Play buttons should exist for each voice
    const playButtons = screen.getAllByRole('button', { name: /preview aria/i });
    expect(playButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders custom voices with play buttons', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    expect(screen.getByText('My Voice')).toBeInTheDocument();
    const playButtons = screen.getAllByRole('button', { name: /preview my voice/i });
    expect(playButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Add Custom Voice" option in Custom Voices section', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    expect(screen.getByRole('option', { name: /add custom voice/i })).toBeInTheDocument();
  });

  it('calls onNavigateToCustomVoices when "Add Custom Voice" is selected', () => {
    const onNavigate = jest.fn();
    render(<VoiceSelector {...defaultProps} onNavigateToCustomVoices={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));
    fireEvent.click(screen.getByRole('option', { name: /add custom voice/i }));

    expect(onNavigate).toHaveBeenCalled();
  });

  it('calls onChange when an Edge-TTS voice is selected', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));
    fireEvent.click(screen.getByRole('option', { name: /aria/i }));

    expect(defaultProps.onChange).toHaveBeenCalledWith('en-US-AriaNeural');
  });

  it('calls onChange with custom- prefix when a custom voice is selected', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));
    fireEvent.click(screen.getByRole('option', { name: /my voice/i }));

    expect(defaultProps.onChange).toHaveBeenCalledWith('custom-cv-1');
  });

  it('shows selected state for Edge-TTS voice', () => {
    render(<VoiceSelector {...defaultProps} value="en-US-AriaNeural" />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    // The selected voice should have checkmark
    const ariaOption = screen.getByRole('option', { name: /aria/i, selected: true });
    expect(ariaOption).toBeInTheDocument();
  });

  it('shows selected state for custom voice', () => {
    render(<VoiceSelector {...defaultProps} value="custom-cv-1" />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    const customOption = screen.getByRole('option', { name: /my voice/i, selected: true });
    expect(customOption).toBeInTheDocument();
  });

  it('filters voices by search query', () => {
    render(<VoiceSelector {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    const searchInput = screen.getByPlaceholderText('Search voices...');
    fireEvent.change(searchInput, { target: { value: 'aria' } });

    expect(screen.getByText('Aria')).toBeInTheDocument();
    expect(screen.queryByText('Guy')).not.toBeInTheDocument();
  });

  it('shows "No voices available" when no voices', () => {
    render(<VoiceSelector {...defaultProps} voices={[]} customVoices={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /select voice/i }));

    expect(screen.getByText(/no voices available/i)).toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', () => {
    render(<VoiceSelector {...defaultProps} disabled={true} />);

    const triggerButton = screen.getByRole('button', { name: /select voice/i });
    expect(triggerButton).toBeDisabled();
  });
});