'use client';

import { useTranslations } from 'next-intl';
import { useAppState } from '../../context/app-context';
import { SOURCES } from '../../lib/sources';

export default function VersionPanel() {
  const t = useTranslations();
  const { appVersion, lolVersion, scraperStatuses } = useAppState();

  const getSourceVersion = (sourceId: string): string => {
    const status = scraperStatuses.find(s => s.id === sourceId);
    if (!status) return t('loading');
    if (status.status === 'Available' && status.retrieved_value?.trim()) {
      return status.retrieved_value.trim();
    }
    return t('na');
  };

  return (
    <div className="versions-panel">
      <div className="versions-col">
        <div className="version-row">
          <span className="label">{t('versions.local_items_label')}</span>
          <span className="value">{appVersion || t('unknown')}</span>
        </div>
        <div className="version-row">
          <span className="label">{t('versions.lol_label')}</span>
          <span className="value">{lolVersion || t('loading')}</span>
        </div>
      </div>
      <div className="versions-col">
        {SOURCES.map(source => (
          <div key={source.id} className="version-row">
            <span className="label">{t('versions.source_label', { source: source.name })}</span>
            <span className="value">{getSourceVersion(source.id)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

