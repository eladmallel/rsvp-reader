import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordDisplay, calculateORPIndex } from './WordDisplay';

describe('calculateORPIndex', () => {
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
});
