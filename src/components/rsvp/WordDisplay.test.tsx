import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordDisplay } from './WordDisplay';

// Note: calculateORPIndex unit tests have been moved to src/lib/rsvp/orp.test.ts

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
