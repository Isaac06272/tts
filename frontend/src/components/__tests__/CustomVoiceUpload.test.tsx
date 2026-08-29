import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CustomVoiceUpload } from '../CustomVoiceUpload';
import { api } from '@/lib/api';

// Mock the api module
jest.mock('@/lib/api', () => ({
  api: {
    createCustomVoice: jest.fn(),
  },
}));

const mockOnVoiceAdded = jest.fn();

describe('CustomVoiceUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnVoiceAdded.mockClear();
  });

  const defaultProps = {
    onVoiceAdded: mockOnVoiceAdded,
    maxVoices: 10,
    currentCount: 0,
  };

  it('renders upload area when no file selected', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('shows file details after file selection', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('test-voice.mp3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-voice')).toBeInTheDocument();
  });

  it('validates file type', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
  });

  it('validates file size', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    // Create a file larger than 50MB
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it('requires name before submit', async () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    // Name should be auto-filled from filename, but clear it
    const nameInput = screen.getByLabelText('Voice Name *');
    fireEvent.change(nameInput, { target: { value: '' } });

    // The submit button should be disabled when name is empty
    const submitButton = screen.getByRole('button', { name: /add voice/i });
    expect(submitButton).toBeDisabled();

    // Enter a name and submit should work
    fireEvent.change(nameInput, { target: { value: 'Test Voice' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls api.createCustomVoice with correct FormData on successful upload', async () => {
    const mockVoice = {
      id: 'cv-1',
      name: 'Test Voice',
      description: 'Test description',
      sample_path: '/uploads/voices/cv-1/sample.mp3',
      voice_id: '/uploads/voices/cv-1/sample.mp3',
      language: 'en',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    (api.createCustomVoice as jest.Mock).mockResolvedValue(mockVoice);

    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    const nameInput = screen.getByLabelText('Voice Name *');
    fireEvent.change(nameInput, { target: { value: 'My Custom Voice' } });

    const submitButton = screen.getByRole('button', { name: /add voice/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.createCustomVoice).toHaveBeenCalled();
    });

    // Check that the API was called with correct parameters
    const callArgs = (api.createCustomVoice as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toEqual({
      name: 'My Custom Voice',
      description: '',
      language: 'en',
    });
    expect(callArgs[1]).toBe(file);

    // Check onVoiceAdded was called with the returned voice
    expect(mockOnVoiceAdded).toHaveBeenCalledWith(mockVoice);
  });

  it('displays user-friendly error message when API call fails', async () => {
    (api.createCustomVoice as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    const nameInput = screen.getByLabelText('Voice Name *');
    fireEvent.change(nameInput, { target: { value: 'My Custom Voice' } });

    const submitButton = screen.getByRole('button', { name: /add voice/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('displays user-friendly error message when API returns HTTP error', async () => {
    (api.createCustomVoice as jest.Mock).mockRejectedValue(new Error('HTTP error 500'));

    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    const nameInput = screen.getByLabelText('Voice Name *');
    fireEvent.change(nameInput, { target: { value: 'My Custom Voice' } });

    const submitButton = screen.getByRole('button', { name: /add voice/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Should show user-friendly message instead of raw HTTP error
      expect(screen.getByText(/server error. please try again later/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during upload', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (api.createCustomVoice as jest.Mock).mockReturnValue(promise);

    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    const submitButton = screen.getByRole('button', { name: /add voice/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/processing voice/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    resolvePromise!({
      id: 'cv-1',
      name: 'Test Voice',
      description: '',
      sample_path: '',
      voice_id: '',
      language: 'en',
      is_active: true,
      created_at: '',
      updated_at: '',
    });

    await waitFor(() => {
      expect(screen.queryByText(/processing voice/i)).not.toBeInTheDocument();
    });
  });

  it('disables submit when max voices reached', () => {
    render(<CustomVoiceUpload {...defaultProps} maxVoices={2} currentCount={2} />);

    expect(screen.getByText(/maximum 2 custom voices reached/i)).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /add voice/i });
    expect(submitButton).toBeDisabled();
  });

  it('allows removing selected file', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'test-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('test-voice.mp3')).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /remove file/i });
    fireEvent.click(removeButton);

    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
  });

  it('pre-fills name from filename', () => {
    render(<CustomVoiceUpload {...defaultProps} />);

    const file = new File(['test audio'], 'my-narrator-voice.mp3', { type: 'audio/mp3' });
    const input = screen.getByLabelText('Upload voice sample');

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByDisplayValue('my-narrator-voice')).toBeInTheDocument();
  });
});