import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'anchorbox_theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

const resolve = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? (media().matches ? 'dark' : 'light') : preference;

interface ThemeState {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(readPreference()));

  useEffect(() => {
    const apply = () => {
      const next = resolve(preference);
      setTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#000000' : '#F2F2F7');
    };
    apply();
    if (preference !== 'system') return;
    const query = media();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: keep the in-memory choice */
    }
    setPreferenceState(next);
  }, []);

  const toggle = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [setPreference, theme]);

  const value = useMemo(() => ({ preference, theme, setPreference, toggle }), [preference, theme, setPreference, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
