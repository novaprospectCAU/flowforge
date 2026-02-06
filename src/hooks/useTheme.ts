/**
 * Theme system for FlowForge
 * Provides dark/light mode toggle with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgActive: string;
  bgOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Accent
  accent: string;
  accentHover: string;
  accentActive: string;

  // Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Node specific
  nodeBg: string;
  nodeHeader: string;
  portInput: string;
  portOutput: string;

  // Canvas
  canvasBg: string;
  gridMinor: string;
  gridMajor: string;
}

const darkTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#1e1e20',
  bgSecondary: '#252526',
  bgTertiary: '#2d2d30',
  bgHover: '#3c3c3c',
  bgActive: '#4a4a4a',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',

  // Borders
  border: '#3c3c3c',
  borderLight: '#4a4a4a',

  // Accent
  accent: '#0078d4',
  accentHover: '#1084d8',
  accentActive: '#006cc1',

  // Status
  success: '#68d391',
  warning: '#f6e05e',
  error: '#fc8181',
  info: '#63b3ed',

  // Node specific
  nodeBg: '#2d2d30',
  nodeHeader: '#3c3c3c',
  portInput: '#4ade80',
  portOutput: '#f97316',

  // Canvas
  canvasBg: '#1e1e1e',
  gridMinor: '#282830',
  gridMajor: '#363640',
};

const lightTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  bgTertiary: '#e8e8e8',
  bgHover: '#e0e0e0',
  bgActive: '#d0d0d0',
  bgOverlay: 'rgba(0, 0, 0, 0.3)',

  // Text
  textPrimary: '#1a1a1a',
  textSecondary: '#4a4a4a',
  textMuted: '#888888',

  // Borders
  border: '#d0d0d0',
  borderLight: '#e0e0e0',

  // Accent
  accent: '#0066cc',
  accentHover: '#0055b3',
  accentActive: '#004499',

  // Status
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',

  // Node specific
  nodeBg: '#ffffff',
  nodeHeader: '#f0f0f0',
  portInput: '#22c55e',
  portOutput: '#f97316',

  // Canvas
  canvasBg: '#f8f8f8',
  gridMinor: '#e8e8e8',
  gridMajor: '#d0d0d0',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'flowforge-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      // Check system preference
      if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  const colors = mode === 'dark' ? darkTheme : lightTheme;

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setTheme]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.style.backgroundColor = colors.bgPrimary;
    document.body.style.color = colors.textPrimary;
  }, [mode, colors]);

  return createElement(
    ThemeContext.Provider,
    { value: { mode, colors, toggleTheme, setTheme } },
    children
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export themes for canvas rendering (which doesn't use React context)
export const themes = {
  dark: darkTheme,
  light: lightTheme,
};

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}
