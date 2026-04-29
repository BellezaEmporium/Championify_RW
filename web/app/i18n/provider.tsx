'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { NextIntlClientProvider, useTranslations as useNextIntlTranslations } from 'next-intl';
import { DEFAULT_LOCALE, resolveLocale, type SupportedLocale } from './config';

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function useLocale() {
  return useContext(I18nContext);
}

export { useNextIntlTranslations as useTranslations };

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`/translations/${locale}.json`);
    if (!res.ok) throw new Error(`Failed to load ${locale}`);
    return await res.json();
  } catch {
    if (locale !== DEFAULT_LOCALE) {
      try {
        const fallback = await fetch(`/translations/${DEFAULT_LOCALE}.json`);
        return await fallback.json();
      } catch {
        return {};
      }
    }
    return {};
  }
}

interface I18nProviderProps {
  initialLocale?: string;
  children: ReactNode;
}

export function I18nProvider({ initialLocale, children }: I18nProviderProps) {
  const resolved = resolveLocale(initialLocale);
  const [locale, setLocaleState] = useState<SupportedLocale>(resolved);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
  }, []);

  useEffect(() => {
    loadMessages(locale).then(setMessages);
  }, [locale]);

  if (!messages) {
    // Show a minimal loading state instead of null to avoid hydration issues
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}

