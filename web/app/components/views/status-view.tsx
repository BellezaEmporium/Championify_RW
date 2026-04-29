'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAppState } from '../../context/app-context';
import ProgressBar from '../ui/progress-bar';

export default function StatusView() {
  const t = useTranslations();
  const { progressLog } = useAppState();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLog]);

  // Simple progress estimate based on log entries
  const percent = Math.min(95, progressLog.length * 5);

  return (
    <div className="status-page">
      <div className="status-header text-center mb-3">
        <h2 className="text-lg font-semibold text-white tracking-wide">{t('status')}</h2>
      </div>

      <div className="status-card">
        <ProgressBar percent={percent} />

        <div className="status-log mt-4">
          <div className="status-log-body progresslog">
            {progressLog.map((entry, i) => (
              <div
                key={i}
                className={`text-sm mb-1 ${
                  entry.type === 'error'
                    ? 'text-red-400'
                    : entry.type === 'success'
                      ? 'text-green-400'
                      : 'text-slate-200'
                }`}
              >
                [{entry.timestamp}] {entry.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

