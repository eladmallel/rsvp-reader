import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordDisplay, calculateORPIndex } from './WordDisplay';

describe('calculateORPIndex', () => {
  describe('LTR (default)', () => {
    it('returns 0 for empty strings', () => {
      expect(calculateORPIndex(0)).toBe(0);
    });

    it('returns 0 for single character words', () => {
      expect(calculateORPIndex(1)).toBe(0);
    });

    it('returns 1 for 2-5 character words', () => {
      expect(calculateORPIndex(2)).toBe(1);
      expect(calculateORPIndex(3)).toBe(1);
      expect(calculateORPIndex(4)).toBe(1);
      expect(calculateORPIndex(5)).toBe(1);
    });

    it('returns 2 for 6-9 character words', () => {
      expect(calculateORPIndex(6)).toBe(2);
      expect(calculateORPIndex(7)).toBe(2);
      expect(calculateORPIndex(8)).toBe(2);
      expect(calculateORPIndex(9)).toBe(2);
    });

    it('returns 3 for 10-13 character words', () => {
      expect(calculateORPIndex(10)).toBe(3);
      expect(calculateORPIndex(11)).toBe(3);
      expect(calculateORPIndex(12)).toBe(3);
      expect(calculateORPIndex(13)).toBe(3);
    });

    it('returns 4 for words longer than 13 characters', () => {
      expect(calculateORPIndex(14)).toBe(4);
      expect(calculateORPIndex(20)).toBe(4);
      expect(calculateORPIndex(100)).toBe(4);
    });
  });

  describe('RTL', () => {
    it('returns last index for single character RTL words', () => {
      expect(calculateORPIndex(1, true)).toBe(0);
    });

    it('calculates ORP from right for 2-5 character RTL words', () => {
      // For length 2: offset=1, so index = 2-1-1 = 0
      expect(calculateORPIndex(2, true)).toBe(0);
      // For length 3: offset=1, so index = 3-1-1 = 1
      expect(calculateORPIndex(3, true)).toBe(1);
      // For length 4: offset=1, so index = 4-1-1 = 2
      expect(calculateORPIndex(4, true)).toBe(2);
      // For length 5: offset=1, so index = 5-1-1 = 3
      expect(calculateORPIndex(5, true)).toBe(3);
    });

    it('calculates ORP from right for 6-9 character RTL words', () => {
      // For length 6: offset=2, so index = 6-1-2 = 3
      expect(calculateORPIndex(6, true)).toBe(3);
      // For length 7: offset=2, so index = 7-1-2 = 4
      expect(calculateORPIndex(7, true)).toBe(4);
    });

    it('handles very long RTL words', () => {
      // For length 20: returns length - 5 = 15
      expect(calculateORPIndex(20, true)).toBe(15);
    });
  });
});

describe('WordDisplay', () => {
  it('renders placeholder when no word is provided', () => {
    render(<WordDisplay word="" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders the word with ORP highlighting', () => {
    render(<WordDisplay word="Reading" />);

    // "Reading" has 7 chars, ORP should be at index 2 = 'a'
    // Left: "Re", ORP: "a", Right: "ding"
    expect(screen.getByText('Re')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('ding')).toBeInTheDocument();
  });

  it('highlights the ORP character with correct class', () => {
    const { container } = render(<WordDisplay word="Test" />);

    // "Test" has 4 chars, ORP should be at index 1 = 'e'
    const orpElement = container.querySelector('[class*="orp"]');
    expect(orpElement).toBeInTheDocument();
    expect(orpElement).toHaveTextContent('e');
  });

  it('uses provided orpIndex when specified', () => {
    render(<WordDisplay word="Hello" orpIndex={0} />);

    // Should highlight first character
    const orpElement = screen.getByText('H');
    expect(orpElement).toBeInTheDocument();
  });

  it('handles single character words', () => {
    render(<WordDisplay word="I" />);

    // Single char word - ORP at index 0
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  it('handles very long words', () => {
    render(<WordDisplay word="Internationalization" />);

    // 20 chars, ORP at index 4 = 'r'
    expect(screen.getByText('Inte')).toBeInTheDocument();
    expect(screen.getByText('r')).toBeInTheDocument();
    expect(screen.getByText('nationalization')).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<WordDisplay word="Testing" />);

    expect(screen.getByLabelText('Current word: Testing')).toBeInTheDocument();
  });

  it('renders focus line indicator', () => {
    const { container } = render(<WordDisplay word="Focus" />);

    const focusLine = container.querySelector('[class*="focusLine"]');
    expect(focusLine).toBeInTheDocument();
  });

  describe('RTL Support', () => {
    it('detects Hebrew word and applies RTL direction', () => {
      const { container } = render(<WordDisplay word="שלום" />);

      const wordElement = container.querySelector('[dir="rtl"]');
      expect(wordElement).toBeInTheDocument();
    });

    it('applies RTL class for Hebrew words', () => {
      const { container } = render(<WordDisplay word="שלום" />);

      const wordElement = container.querySelector('[class*="rtl"]');
      expect(wordElement).toBeInTheDocument();
    });

    it('does not apply RTL for English words', () => {
      const { container } = render(<WordDisplay word="Hello" />);

      const wordElement = container.querySelector('[dir="ltr"]');
      expect(wordElement).toBeInTheDocument();
    });

    it('renders Hebrew word with correct ORP (from right)', () => {
      render(<WordDisplay word="שלום" />);
      // Hebrew word "שלום" (4 chars)
      // RTL ORP: offset=1, index = 4-1-1 = 2
      // So the split is: שלו (left), ם (ORP empty as it's combined)
      // Actually for "שלום": chars are ש, ל, ו, ם
      // Index 2 = ו
      expect(screen.getByLabelText('Current word: שלום')).toBeInTheDocument();
    });

    it('renders Arabic word with RTL direction', () => {
      const { container } = render(<WordDisplay word="مرحبا" />);

      const wordElement = container.querySelector('[dir="rtl"]');
      expect(wordElement).toBeInTheDocument();
    });
  });
});
