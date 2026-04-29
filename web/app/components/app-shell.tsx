'use client';

import { useTranslations } from 'next-intl';
import { useAppState } from '../context/app-context';
import Background from './background';
import Titlebar from './titlebar';
import Footer from './footer';
import MainForm from './views/main-form';
import StatusView from './views/status-view';
import DoneView from './views/done-view';
import ErrorView from './views/error-view';

export default function AppShell() {
  const t = useTranslations();
  const { view } = useAppState();

  return (
    <>
      <Background />
      <div className="app-shell">
        <Titlebar />

        <div className="text-center px-3 pt-3">
          <div className="logo-ring mx-auto mb-4">
            <img src="/img/logo.png" alt={t('branding.logo_alt')} className="logo-img" />
          </div>
          <div className="h-px bg-white/10 opacity-50" />
        </div>

        <div className="app-card">
          {view === 'main' && <MainForm />}
          {view === 'status' && <StatusView />}
          {view === 'done' && <DoneView />}
          {view === 'error' && <ErrorView />}
        </div>

        <Footer />
      </div>
    </>
  );
}

