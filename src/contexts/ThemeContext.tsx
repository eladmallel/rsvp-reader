'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** Current theme setting (light, dark, or system) */
  theme: Theme;
  /** The resolved theme after applying system preference */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'rsvp-reader-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

function applyTheme(theme: Theme, resolvedTheme: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'system') {
    // Remove data-theme to let CSS media queries handle it
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', resolvedTheme);
  }
}

// Store for theme state with listeners
let themeState: { theme: Theme; resolvedTheme: ResolvedTheme } = {
  theme: 'system',
  resolvedTheme: 'dark',
};
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return themeState;
}

const serverSnapshot = { theme: 'system' as Theme, resolvedTheme: 'dark' as ResolvedTheme };

function getServerSnapshot() {
  return serverSnapshot;
}

function updateThemeState(theme: Theme, resolvedTheme: ResolvedTheme) {
  themeState = { theme, resolvedTheme };
  listeners.forEach((listener) => listener());
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme if no preference is stored */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme ?? defaultTheme;
    const systemTheme = getSystemTheme();
    const resolved = initialTheme === 'system' ? systemTheme : initialTheme;

    updateThemeState(initialTheme, resolved);
    applyTheme(initialTheme, resolved);
  }, [defaultTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      if (state.theme === 'system') {
        updateThemeState('system', newSystemTheme);
        applyTheme('system', newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [state.theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    const systemTheme = getSystemTheme();
    const resolved = newTheme === 'system' ? systemTheme : newTheme;

    updateThemeState(newTheme, resolved);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme, resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme: Theme = state.resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [state.resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: state.theme,
        resolvedTheme: state.resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
