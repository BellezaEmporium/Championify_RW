'use client';

import { I18nProvider } from './i18n/provider';
import { AppProvider, useAppState } from './context/app-context';
import AppShell from './components/app-shell';

function AppContent() {
  const { initialized, locale } = useAppState();

  if (!initialized) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <I18nProvider initialLocale={locale}>
      <AppShell />
    </I18nProvider>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

