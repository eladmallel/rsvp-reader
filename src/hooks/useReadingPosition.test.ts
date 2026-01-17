import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReadingPosition } from './useReadingPosition';

describe('useReadingPosition', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('returns 0 when no saved position exists', () => {
      const { result } = renderHook(() => useReadingPosition('article-123'));

      expect(result.current.savedPosition).toBe(0);
    });

    it('returns saved position from localStorage', () => {
      localStorage.setItem('rsvp-position-article-123', '42');
      const { result } = renderHook(() => useReadingPosition('article-123'));

      expect(result.current.savedPosition).toBe(42);
    });

    it('handles invalid localStorage value gracefully', () => {
      localStorage.setItem('rsvp-position-article-123', 'not-a-number');
      const { result } = renderHook(() => useReadingPosition('article-123'));

      expect(result.current.savedPosition).toBe(0);
    });

    it('handles null articleId', () => {
      const { result } = renderHook(() => useReadingPosition(null));

      expect(result.current.savedPosition).toBe(0);
    });

    it('uses different keys for different articles', () => {
      localStorage.setItem('rsvp-position-article-1', '10');
      localStorage.setItem('rsvp-position-article-2', '20');

      const { result: result1 } = renderHook(() => useReadingPosition('article-1'));
      const { result: result2 } = renderHook(() => useReadingPosition('article-2'));

      expect(result1.current.savedPosition).toBe(10);
      expect(result2.current.savedPosition).toBe(20);
    });
  });

  describe('saving position', () => {
    it('saves position to localStorage', () => {
      const { result } = renderHook(() => useReadingPosition('article-123'));

      act(() => {
        result.current.savePosition(50);
        vi.advanceTimersByTime(600); // Wait for debounce
      });

      expect(localStorage.getItem('rsvp-position-article-123')).toBe('50');
    });

    it('debounces rapid saves', () => {
      const { result } = renderHook(() => useReadingPosition('article-123'));

      act(() => {
        result.current.savePosition(10);
        result.current.savePosition(20);
        result.current.savePosition(30);
        vi.advanceTimersByTime(600);
      });

      // Only the last value should be saved
      expect(localStorage.getItem('rsvp-position-article-123')).toBe('30');
    });

    it('does not save when articleId is null', () => {
      const { result } = renderHook(() => useReadingPosition(null));

      act(() => {
        result.current.savePosition(50);
        vi.advanceTimersByTime(600);
      });

      // No keys should be set
      expect(localStorage.length).toBe(0);
    });
  });

  describe('clearing position', () => {
    it('clears position from localStorage', () => {
      localStorage.setItem('rsvp-position-article-123', '42');
      const { result } = renderHook(() => useReadingPosition('article-123'));

      act(() => {
        result.current.clearPosition();
      });

      expect(localStorage.getItem('rsvp-position-article-123')).toBeNull();
    });

    it('does nothing when articleId is null', () => {
      localStorage.setItem('rsvp-position-some-article', '42');
      const { result } = renderHook(() => useReadingPosition(null));

      act(() => {
        result.current.clearPosition();
      });

      // Should not affect other articles
      expect(localStorage.getItem('rsvp-position-some-article')).toBe('42');
    });
  });

  describe('article changes', () => {
    it('updates savedPosition when articleId changes', () => {
      localStorage.setItem('rsvp-position-article-1', '10');
      localStorage.setItem('rsvp-position-article-2', '20');

      const { result, rerender } = renderHook(({ id }) => useReadingPosition(id), {
        initialProps: { id: 'article-1' },
      });

      expect(result.current.savedPosition).toBe(10);

      rerender({ id: 'article-2' });

      expect(result.current.savedPosition).toBe(20);
    });
  });
});
