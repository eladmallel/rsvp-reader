/**
 * useRSVPPlayer - Custom hook for RSVP player state management
 *
 * Handles:
 * - Word tokenization and navigation
 * - Playback state (playing/paused)
 * - Timer-based word advancement
 * - WPM control and timing calculations
 * - Sentence and paragraph navigation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  tokenize,
  getPreviousSentenceStart,
  getNextSentenceStart,
  WordToken,
} from '@/lib/rsvp/tokenizer';
import { calculateWordTime } from '@/lib/rsvp/timing';

/**
 * Player state
 */
export type PlayerState = 'idle' | 'playing' | 'paused' | 'finished';

/**
 * Configuration options for the RSVP player
 */
export interface RSVPPlayerConfig {
  /** Initial words per minute (default: 300) */
  initialWpm?: number;
  /** Minimum WPM (default: 100) */
  minWpm?: number;
  /** Maximum WPM (default: 1000) */
  maxWpm?: number;
  /** Whether to auto-pause at paragraph boundaries (default: false) */
  pauseAtParagraphs?: boolean;
  /** Callback when reading is complete */
  onComplete?: () => void;
  /** Callback when word changes */
  onWordChange?: (index: number, token: WordToken) => void;
}

/**
 * Return type for useRSVPPlayer hook
 */
export interface RSVPPlayerReturn {
  // State
  /** Current player state */
  state: PlayerState;
  /** Array of word tokens */
  tokens: WordToken[];
  /** Current word index */
  currentIndex: number;
  /** Current word token */
  currentToken: WordToken | null;
  /** Current word string */
  currentWord: string;
  /** Whether current word is RTL */
  isRtl: boolean;
  /** Total word count */
  totalWords: number;
  /** Current WPM setting */
  wpm: number;
  /** Progress percentage (0-100) */
  progress: number;

  // Actions
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Toggle play/pause */
  togglePlayPause: () => void;
  /** Go to previous word */
  previousWord: () => void;
  /** Go to next word */
  nextWord: () => void;
  /** Go to start of previous sentence */
  previousSentence: () => void;
  /** Go to start of next sentence */
  nextSentence: () => void;
  /** Jump to specific word index */
  goToIndex: (index: number) => void;
  /** Set WPM */
  setWpm: (wpm: number) => void;
  /** Reset to beginning */
  reset: () => void;
  /** Set new text content */
  setText: (text: string) => void;
}

/**
 * Custom hook for RSVP player functionality.
 *
 * @param text - Initial text content to read
 * @param config - Configuration options
 * @returns Player state and control functions
 *
 * @example
 * const player = useRSVPPlayer("Hello world. This is a test.", {
 *   initialWpm: 300,
 *   onComplete: () => console.log("Done!")
 * });
 *
 * // In component:
 * <WordDisplay word={player.currentWord} />
 * <button onClick={player.togglePlayPause}>
 *   {player.state === 'playing' ? 'Pause' : 'Play'}
 * </button>
 */
export function useRSVPPlayer(
  text: string,
  config: RSVPPlayerConfig = {}
): RSVPPlayerReturn {
  const {
    initialWpm = 300,
    minWpm = 100,
    maxWpm = 1000,
    pauseAtParagraphs = false,
    onComplete,
    onWordChange,
  } = config;

  // Core state
  const [tokens, setTokens] = useState<WordToken[]>(() => tokenize(text));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<PlayerState>('idle');
  const [wpm, setWpmState] = useState(initialWpm);

  // Refs for timer and callbacks
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onWordChangeRef = useRef(onWordChange);
  const pauseAtParagraphsRef = useRef(pauseAtParagraphs);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onWordChangeRef.current = onWordChange;
  }, [onWordChange]);

  useEffect(() => {
    pauseAtParagraphsRef.current = pauseAtParagraphs;
  }, [pauseAtParagraphs]);

  // Derived state
  const currentToken = tokens[currentIndex] ?? null;
  const currentWord = currentToken?.word ?? '';
  const isRtl = currentToken?.isRtl ?? false;
  const totalWords = tokens.length;
  const progress = totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle word change callback
  useEffect(() => {
    if (currentToken && onWordChangeRef.current) {
      onWordChangeRef.current(currentIndex, currentToken);
    }
  }, [currentIndex, currentToken]);

  // Advance to next word (internal function)
  const advanceWord = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;

      // Check if we've reached the end
      if (nextIndex >= tokens.length) {
        setState('finished');
        onCompleteRef.current?.();
        return prev;
      }

      // Check for paragraph boundary pause
      if (pauseAtParagraphsRef.current && tokens[nextIndex]) {
        const currentParagraph = tokens[prev]?.paragraph;
        const nextParagraph = tokens[nextIndex]?.paragraph;
        if (
          currentParagraph !== undefined &&
          nextParagraph !== undefined &&
          currentParagraph !== nextParagraph
        ) {
          setState('paused');
        }
      }

      return nextIndex;
    });
  }, [tokens]);

  // Timer effect for automatic playback
  useEffect(() => {
    if (state !== 'playing' || !currentToken) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const wordTime = calculateWordTime(currentWord, wpm);

    timerRef.current = setTimeout(() => {
      advanceWord();
    }, wordTime);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state, currentIndex, currentWord, wpm, advanceWord, currentToken]);

  // Actions
  const play = useCallback(() => {
    if (tokens.length === 0) return;

    if (state === 'finished') {
      // If finished, restart from beginning
      setCurrentIndex(0);
    }
    setState('playing');
  }, [state, tokens.length]);

  const pause = useCallback(() => {
    setState('paused');
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state === 'playing') {
      pause();
    } else {
      play();
    }
  }, [state, play, pause]);

  const previousWord = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    if (state === 'finished') {
      setState('paused');
    }
  }, [state]);

  const nextWord = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(tokens.length - 1, prev + 1);
      if (next === tokens.length - 1 && prev === next) {
        setState('finished');
        onCompleteRef.current?.();
      }
      return next;
    });
  }, [tokens.length]);

  const previousSentence = useCallback(() => {
    const newIndex = getPreviousSentenceStart(tokens, currentIndex);
    setCurrentIndex(newIndex);
    if (state === 'finished') {
      setState('paused');
    }
  }, [tokens, currentIndex, state]);

  const nextSentence = useCallback(() => {
    const newIndex = getNextSentenceStart(tokens, currentIndex);
    setCurrentIndex(newIndex);
    if (newIndex === tokens.length - 1) {
      setState('finished');
      onCompleteRef.current?.();
    }
  }, [tokens, currentIndex]);

  const goToIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(tokens.length - 1, index));
      setCurrentIndex(clampedIndex);
      if (state === 'finished' && clampedIndex < tokens.length - 1) {
        setState('paused');
      }
    },
    [tokens.length, state]
  );

  const setWpm = useCallback(
    (newWpm: number) => {
      const clampedWpm = Math.max(minWpm, Math.min(maxWpm, newWpm));
      setWpmState(clampedWpm);
    },
    [minWpm, maxWpm]
  );

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setState('idle');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setText = useCallback((newText: string) => {
    const newTokens = tokenize(newText);
    setTokens(newTokens);
    setCurrentIndex(0);
    setState('idle');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    // State
    state,
    tokens,
    currentIndex,
    currentToken,
    currentWord,
    isRtl,
    totalWords,
    wpm,
    progress,

    // Actions
    play,
    pause,
    togglePlayPause,
    previousWord,
    nextWord,
    previousSentence,
    nextSentence,
    goToIndex,
    setWpm,
    reset,
    setText,
  };
}
