import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRSVPPlayer } from './useRSVPPlayer';

describe('useRSVPPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world'));

      expect(result.current.state).toBe('idle');
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.wpm).toBe(300);
      expect(result.current.totalWords).toBe(2);
      expect(result.current.progress).toBe(0);
    });

    it('tokenizes text correctly', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world. How are you?'));

      expect(result.current.tokens).toHaveLength(5);
      expect(result.current.tokens.map((t) => t.word)).toEqual([
        'Hello',
        'world.',
        'How',
        'are',
        'you?',
      ]);
    });

    it('returns empty tokens for empty text', () => {
      const { result } = renderHook(() => useRSVPPlayer(''));

      expect(result.current.tokens).toHaveLength(0);
      expect(result.current.currentWord).toBe('');
      expect(result.current.totalWords).toBe(0);
    });

    it('uses custom initial WPM', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello', { initialWpm: 500 }));

      expect(result.current.wpm).toBe(500);
    });

    it('uses initialIndex to start at a specific word', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three Four', { initialIndex: 2 }));

      expect(result.current.currentIndex).toBe(2);
      expect(result.current.currentWord).toBe('Three');
    });

    it('clamps initialIndex to valid range', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two', { initialIndex: 100 }));

      // Should be clamped to last valid index (1)
      expect(result.current.currentIndex).toBe(1);
    });

    it('clamps negative initialIndex to 0', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two', { initialIndex: -5 }));

      expect(result.current.currentIndex).toBe(0);
    });

    it('handles initialIndex with empty text', () => {
      const { result } = renderHook(() => useRSVPPlayer('', { initialIndex: 5 }));

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentWord).toBe('');
    });
  });

  describe('current word', () => {
    it('returns first word initially', () => {
      const { result } = renderHook(() => useRSVPPlayer('First second third'));

      expect(result.current.currentWord).toBe('First');
      expect(result.current.currentIndex).toBe(0);
    });

    it('tracks RTL status correctly', () => {
      const { result } = renderHook(() => useRSVPPlayer('שלום'));

      expect(result.current.isRtl).toBe(true);
    });

    it('tracks LTR status correctly', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello'));

      expect(result.current.isRtl).toBe(false);
    });
  });

  describe('play/pause', () => {
    it('starts playing when play is called', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world'));

      act(() => {
        result.current.play();
      });

      expect(result.current.state).toBe('playing');
    });

    it('pauses when pause is called', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world'));

      act(() => {
        result.current.play();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.state).toBe('paused');
    });

    it('toggles between playing and paused', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world'));

      act(() => {
        result.current.togglePlayPause();
      });
      expect(result.current.state).toBe('playing');

      act(() => {
        result.current.togglePlayPause();
      });
      expect(result.current.state).toBe('paused');
    });

    it('does not play if text is empty', () => {
      const { result } = renderHook(() => useRSVPPlayer(''));

      act(() => {
        result.current.play();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('automatic word advancement', () => {
    it('advances to next word after timer', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world today', { initialWpm: 300 }));

      act(() => {
        result.current.play();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentWord).toBe('Hello');

      // Advance time (word time at 300 WPM is ~200ms + length adjustment)
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentWord).toBe('world');
    });

    it('does not advance when paused', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello world', { initialWpm: 300 }));

      act(() => {
        result.current.play();
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it('transitions to finished state at end', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two', { initialWpm: 300 }));

      act(() => {
        result.current.play();
      });

      // Advance past first word
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.currentIndex).toBe(1);

      // Advance past second word
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(result.current.state).toBe('finished');
    });

    it('calls onComplete when finished', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useRSVPPlayer('One', { initialWpm: 300, onComplete }));

      act(() => {
        result.current.play();
      });

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('manual navigation', () => {
    it('goes to previous word', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three'));

      act(() => {
        result.current.goToIndex(2);
      });

      expect(result.current.currentWord).toBe('Three');

      act(() => {
        result.current.previousWord();
      });

      expect(result.current.currentWord).toBe('Two');
    });

    it('does not go before first word', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two'));

      act(() => {
        result.current.previousWord();
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it('goes to next word', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three'));

      act(() => {
        result.current.nextWord();
      });

      expect(result.current.currentWord).toBe('Two');
    });

    it('does not go past last word', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two'));

      act(() => {
        result.current.goToIndex(1);
      });

      act(() => {
        result.current.nextWord();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.state).toBe('finished');
    });

    it('jumps to specific index', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three Four Five'));

      act(() => {
        result.current.goToIndex(3);
      });

      expect(result.current.currentWord).toBe('Four');
      expect(result.current.currentIndex).toBe(3);
    });

    it('clamps index to valid range', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two'));

      act(() => {
        result.current.goToIndex(100);
      });

      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.goToIndex(-5);
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('sentence navigation', () => {
    it('goes to previous sentence start', () => {
      const { result } = renderHook(() => useRSVPPlayer('First sentence. Second sentence.'));

      // Go to "Second"
      act(() => {
        result.current.goToIndex(2);
      });

      expect(result.current.currentWord).toBe('Second');

      act(() => {
        result.current.previousSentence();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.currentWord).toBe('First');
    });

    it('goes to next sentence start', () => {
      const { result } = renderHook(() => useRSVPPlayer('First sentence. Second sentence.'));

      act(() => {
        result.current.nextSentence();
      });

      expect(result.current.currentWord).toBe('Second');
    });
  });

  describe('WPM control', () => {
    it('changes WPM', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello', { initialWpm: 300 }));

      act(() => {
        result.current.setWpm(500);
      });

      expect(result.current.wpm).toBe(500);
    });

    it('clamps WPM to min value', () => {
      const { result } = renderHook(() => useRSVPPlayer('Hello', { initialWpm: 300, minWpm: 100 }));

      act(() => {
        result.current.setWpm(50);
      });

      expect(result.current.wpm).toBe(100);
    });

    it('clamps WPM to max value', () => {
      const { result } = renderHook(() =>
        useRSVPPlayer('Hello', { initialWpm: 300, maxWpm: 1000 })
      );

      act(() => {
        result.current.setWpm(2000);
      });

      expect(result.current.wpm).toBe(1000);
    });
  });

  describe('reset and setText', () => {
    it('resets to beginning', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three'));

      act(() => {
        result.current.goToIndex(2);
        result.current.play();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.state).toBe('idle');
    });

    it('sets new text content', () => {
      const { result } = renderHook(() => useRSVPPlayer('Original text'));

      act(() => {
        result.current.setText('New content here');
      });

      expect(result.current.totalWords).toBe(3);
      expect(result.current.currentWord).toBe('New');
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.state).toBe('idle');
    });
  });

  describe('progress calculation', () => {
    it('calculates progress correctly', () => {
      const { result } = renderHook(() => useRSVPPlayer('One Two Three Four'));

      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.goToIndex(1);
      });

      expect(result.current.progress).toBe(25);

      act(() => {
        result.current.goToIndex(2);
      });

      expect(result.current.progress).toBe(50);

      act(() => {
        result.current.goToIndex(3);
      });

      expect(result.current.progress).toBe(75);
    });

    it('returns 0 for empty text', () => {
      const { result } = renderHook(() => useRSVPPlayer(''));

      expect(result.current.progress).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('transitions from finished to paused when navigating back', () => {
      const { result } = renderHook(() => useRSVPPlayer('One'));

      act(() => {
        result.current.play();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.state).toBe('finished');

      act(() => {
        result.current.previousWord();
      });

      expect(result.current.state).toBe('paused');
    });

    it('restarts from beginning when playing after finished', () => {
      const { result } = renderHook(() => useRSVPPlayer('One'));

      act(() => {
        result.current.play();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.state).toBe('finished');

      act(() => {
        result.current.play();
      });

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.state).toBe('playing');
    });
  });
});
