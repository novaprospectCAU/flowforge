// Simple i18n system for FlowForge

export type Language = 'en' | 'ko';

const LANGUAGE_KEY = 'flowforge-language';

// Detect browser language
function detectLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'en' || stored === 'ko') {
    return stored;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ko')) {
    return 'ko';
  }
  return 'en';
}

let currentLanguage: Language = detectLanguage();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  localStorage.setItem(LANGUAGE_KEY, lang);
  // Dispatch event for components to re-render
  window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
}

// Translation function
export function t(key: string, translations: Record<Language, Record<string, string>>): string {
  const langStrings = translations[currentLanguage];
  return langStrings[key] || translations['en'][key] || key;
}

// Hook for React components to use language
import { useState, useEffect } from 'react';

export function useLanguage(): Language {
  const [lang, setLang] = useState<Language>(currentLanguage);

  useEffect(() => {
    const handler = (e: Event) => {
      setLang((e as CustomEvent).detail);
    };
    window.addEventListener('languagechange', handler);
    return () => window.removeEventListener('languagechange', handler);
  }, []);

  return lang;
}
