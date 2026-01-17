/**
 * useReadingPosition - Hook for persisting RSVP reading position
 *
 * Stores the current word index in localStorage so users can resume
 * reading where they left off when they return to an article.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'rsvp-position-';
const DEBOUNCE_MS = 500;

/**
 * Get the localStorage key for an article
 */
function getStorageKey(articleId: string): string {
  return `${STORAGE_KEY_PREFIX}${articleId}`;
}

/**
 * Read saved position from localStorage
 */
function getStoredPosition(articleId: string | null): number {
  if (!articleId || typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(getStorageKey(articleId));
    if (stored === null) return 0;

    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    // localStorage might be unavailable
    return 0;
  }
}

export interface UseReadingPositionReturn {
  /** The saved position from localStorage (0 if none) */
  savedPosition: number;
  /** Save a position to localStorage (debounced) */
  savePosition: (index: number) => void;
  /** Clear the saved position */
  clearPosition: () => void;
}

/**
 * Hook for persisting reading position to localStorage
 *
 * @param articleId - Unique identifier for the article (null for demo mode)
 * @returns Functions to save/clear position and the current saved position
 *
 * @example
 * const { savedPosition, savePosition, clearPosition } = useReadingPosition('article-123');
 *
 * // On mount, use savedPosition as initialIndex
 * const player = useRSVPPlayer(text, { initialIndex: savedPosition });
 *
 * // Save position when it changes
 * useEffect(() => {
 *   savePosition(player.currentIndex);
 * }, [player.currentIndex, savePosition]);
 *
 * // Clear position when finished
 * if (player.state === 'finished') {
 *   clearPosition();
 * }
 */
export function useReadingPosition(articleId: string | null): UseReadingPositionReturn {
  // Load initial position from storage
  const [savedPosition, setSavedPosition] = useState<number>(() => getStoredPosition(articleId));

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update savedPosition when articleId changes
  useEffect(() => {
    setSavedPosition(getStoredPosition(articleId));
  }, [articleId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const savePosition = useCallback(
    (index: number) => {
      if (!articleId) return;

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the save
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(getStorageKey(articleId), String(index));
        } catch {
          // localStorage might be full or unavailable
          console.warn('Failed to save reading position');
        }
      }, DEBOUNCE_MS);
    },
    [articleId]
  );

  const clearPosition = useCallback(() => {
    if (!articleId) return;

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    try {
      localStorage.removeItem(getStorageKey(articleId));
      setSavedPosition(0);
    } catch {
      // localStorage might be unavailable
      console.warn('Failed to clear reading position');
    }
  }, [articleId]);

  return {
    savedPosition,
    savePosition,
    clearPosition,
  };
}
