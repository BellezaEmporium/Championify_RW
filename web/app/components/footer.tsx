'use client';

import { useTranslations } from 'next-intl';
import { useAppState } from '../context/app-context';
import { DONATE_URL, GITHUB_URL } from '../lib/sources';

export default function Footer() {
  const t = useTranslations();
  const { appVersion } = useAppState();

  return (
    <footer className="app-footer flex items-center justify-between text-sm gap-4">
      <div className="flex items-center gap-2">
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 hover:text-white transition-colors flex items-center gap-2"
        >
          &#9829; {t('footer.donate')}
        </a>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 hover:text-white transition-colors flex items-center gap-2"
        >
          {t('footer.github_name')}
        </a>
      </div>
      <div className="text-slate-400">{t('footer.version', { version: appVersion })}</div>
    </footer>
  );
}

