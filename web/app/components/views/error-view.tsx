'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAppState, useAppDispatch } from '../../context/app-context';

export default function ErrorView() {
  const t = useTranslations();
  const { error } = useAppState();
  const dispatch = useAppDispatch();

  const handleBack = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_VIEW', payload: 'main' });
  }, [dispatch]);

  return (
    <div className="status-card center" style={{ height: '100%' }}>
      <img src="/img/sad.png" alt="" className="w-16 h-16 mb-4 opacity-60" />
      <h2 className="text-xl font-semibold text-white mb-2">{t('something_broke')}</h2>
      {error && <p className="text-red-300 text-sm mb-4 max-w-xs">{error}</p>}
      <div className="text-slate-400 text-sm space-y-1 mb-4">
        <p>{t('error_1')}</p>
        <p>{t('error_2')}</p>
        <p>{t('error_3')}</p>
      </div>
      <button className="pill-btn ghost" onClick={handleBack}>
        {t('back')}
      </button>
    </div>
  );
}

