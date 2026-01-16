import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component to access theme context
function TestComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolvedTheme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

function createMockMatchMedia(prefersDark: boolean = true) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark ? query === '(prefers-color-scheme: dark)' : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock matchMedia
    window.matchMedia = createMockMatchMedia(true);

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('provides default system theme', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Wait for mount
    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
  });

  it('allows setting theme to light', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    await user.click(screen.getByText('Set Light'));

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    expect(localStorage.getItem('rsvp-reader-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('allows setting theme to dark', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    await user.click(screen.getByText('Set Dark'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    expect(localStorage.getItem('rsvp-reader-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles between light and dark', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    });

    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');

    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
  });

  it('persists theme preference in localStorage', async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    await user.click(screen.getByText('Set Light'));
    expect(localStorage.getItem('rsvp-reader-theme')).toBe('light');

    unmount();

    // Re-render - should restore from localStorage
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  it('respects defaultTheme prop', async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
  });

  it('restores theme from localStorage over defaultTheme', async () => {
    localStorage.setItem('rsvp-reader-theme', 'light');

    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  it('sets system theme when "system" is selected', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    await user.click(screen.getByText('Set System'));

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    // System prefers dark (from mock)
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    // data-theme should be removed for system preference
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('responds to system preference changes when theme is system', async () => {
    let mediaQueryCallback: ((e: MediaQueryListEvent) => void) | null = null;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryCallback = cb;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    });

    // Simulate system preference change to light
    if (mediaQueryCallback) {
      act(() => {
        mediaQueryCallback!({ matches: false } as MediaQueryListEvent);
      });
    }

    await vi.waitFor(() => {
      expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    });
  });
});
