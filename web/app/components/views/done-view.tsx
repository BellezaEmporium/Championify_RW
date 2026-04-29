'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAppDispatch } from '../../context/app-context';

export default function DoneView() {
  const t = useTranslations();
  const dispatch = useAppDispatch();

  const handleBack = useCallback(() => {
    dispatch({ type: 'SET_VIEW', payload: 'main' });
  }, [dispatch]);

  const handleStartLoL = useCallback(async () => {
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      // Attempt to launch LoL client
      await Command.create('open-lol', []).execute();
    } catch {
      // Silently fail if not available
    }
  }, []);

  return (
    <div className="status-card center" style={{ height: '100%' }}>
      <h2 className="text-xl font-semibold text-white mb-2">{t('done')}</h2>
      <div className="cat-emoji">^.^</div>
      <div className="btn-row mt-4">
        <button className="pill-btn ghost" onClick={handleBack}>
          {t('back')}
        </button>
        <button className="primary-btn compact" onClick={handleStartLoL}>
          {t('start_league')}
        </button>
      </div>
    </div>
  );
}

