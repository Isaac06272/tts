import re
from pathlib import Path
from typing import List, Optional
from faster_whisper import WhisperModel
from app.core.config import settings
from app.schemas import SegmentTimestamp


# Global model instance (loaded once at startup)
_model: Optional[WhisperModel] = None


def get_whisper_model() -> WhisperModel:
    """Get or create the Whisper model instance."""
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.WHISPER_MODEL,
            device=settings.WHISPER_DEVICE,
            compute_type=settings.WHISPER_COMPUTE_TYPE,
        )
    return _model


def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences, preserving punctuation."""
    # Split on sentence-ending punctuation followed by whitespace
    # Use a simpler pattern that avoids variable-width lookbehind
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _segment_by_sentences(words: List, full_text: str) -> List[SegmentTimestamp]:
    """
    Re-segment word-level timestamps into sentence-level segments.
    Uses word timestamps for precise sentence boundary detection.
    """
    if not words:
        return []

    sentences = _split_into_sentences(full_text)
    if not sentences:
        return []

    segments = []
    word_idx = 0
    current_sentence = ""

    for sentence in sentences:
        sentence_words = sentence.split()
        if not sentence_words:
            continue

        sentence_start = None
        sentence_end = None
        words_matched = 0

        # Match words to the sentence
        while word_idx < len(words) and words_matched < len(sentence_words):
            word = words[word_idx]
            word_text = word.word.strip()

            if sentence_start is None:
                sentence_start = word.start

            # Compare normalized words (case-insensitive, strip punctuation)
            expected_word = sentence_words[words_matched].strip('.,!?;:"\'').lower()
            actual_word = word_text.strip('.,!?;:"\'').lower()

            if expected_word == actual_word:
                words_matched += 1
                sentence_end = word.end
            elif expected_word in actual_word or actual_word in expected_word:
                # Partial match (e.g., punctuation differences)
                words_matched += 1
                sentence_end = word.end
            elif words_matched == 0:
                # Skip word if we haven't started matching this sentence yet
                pass
            else:
                # Word doesn't match expected, might be transcription variance
                # Just use the timestamp and continue
                words_matched += 1
                sentence_end = word.end

            word_idx += 1

        # Fallback if matching failed
        if sentence_start is None and word_idx < len(words):
            sentence_start = words[word_idx].start
        if sentence_end is None and word_idx > 0:
            sentence_end = words[word_idx - 1].end

        if sentence_start is not None and sentence_end is not None:
            segments.append(SegmentTimestamp(
                text=sentence,
                start=round(sentence_start, 2),
                end=round(sentence_end, 2)
            ))

    return segments


async def transcribe_audio(audio_path: Path) -> List[SegmentTimestamp]:
    """
    Transcribe audio using faster-whisper with word-level timestamps,
    then re-segment into sentence-level segments for accurate timing.

    Args:
        audio_path: Path to the audio file

    Returns:
        List of SegmentTimestamp objects with text, start, end per sentence
    """
    model = get_whisper_model()

    # Run transcription in thread pool to avoid blocking
    import asyncio
    loop = asyncio.get_event_loop()

    def _transcribe():
        # Use word_timestamps=True to get precise word-level timing
        segments, info = model.transcribe(
            str(audio_path),
            word_timestamps=True,
            vad_filter=True,
        )

        all_words = []
        full_text_parts = []

        for segment in segments:
            full_text_parts.append(segment.text.strip())
            if segment.words:
                for word in segment.words:
                    all_words.append(word)

        full_text = " ".join(full_text_parts)

        # Re-segment by sentences using word timestamps for accuracy
        return _segment_by_sentences(all_words, full_text)

    segments = await loop.run_in_executor(None, _transcribe)
    return segments