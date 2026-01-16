import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

function renderWithTheme(
  ui: React.ReactElement,
  defaultTheme: 'light' | 'dark' | 'system' = 'dark'
) {
  return render(<ThemeProvider defaultTheme={defaultTheme}>{ui}</ThemeProvider>);
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('simple toggle mode', () => {
    it('renders toggle button', async () => {
      renderWithTheme(<ThemeToggle />);

      await vi.waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('has accessible label', async () => {
      renderWithTheme(<ThemeToggle />, 'dark');

      await vi.waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
      });
    });

    it('toggles theme on click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ThemeToggle />, 'dark');

      await vi.waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      await user.click(screen.getByRole('button'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('applies custom className', async () => {
      renderWithTheme(<ThemeToggle className="custom-class" />);

      await vi.waitFor(() => {
        expect(screen.getByRole('button').className).toContain('custom-class');
      });
    });
  });

  describe('options mode', () => {
    it('renders all three theme options', async () => {
      renderWithTheme(<ThemeToggle showOptions />);

      await vi.waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument();
      });
    });

    it('has radiogroup role', async () => {
      renderWithTheme(<ThemeToggle showOptions />);

      await vi.waitFor(() => {
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      });
    });

    it('marks current theme as checked', async () => {
      renderWithTheme(<ThemeToggle showOptions />, 'dark');

      await vi.waitFor(() => {
        expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute(
          'aria-checked',
          'true'
        );
        expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute(
          'aria-checked',
          'false'
        );
      });
    });

    it('changes theme when option is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ThemeToggle showOptions />, 'dark');

      await vi.waitFor(() => {
        expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('radio', { name: /light/i }));

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(screen.getByRole('radio', { name: /light/i })).toHaveAttribute('aria-checked', 'true');
    });

    it('sets system theme when system option is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<ThemeToggle showOptions />, 'light');

      await vi.waitFor(() => {
        expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('radio', { name: /system/i }));

      // data-theme should be removed for system
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });
});
