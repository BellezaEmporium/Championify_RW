'use client';

import { useTranslations } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useEffect, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../../context/app-context';
import { SOURCES } from '../../lib/sources';

export default function SourcePicker() {
  const t = useTranslations();
  const { preferences, scraperStatuses } = useAppState();
  const dispatch = useAppDispatch();

  const selected = preferences.sr_source || [];
  const unavailableSourceIds = useMemo(() => {
    return new Set(
      scraperStatuses
        .filter(status => {
          const versionText = status.retrieved_value?.toLowerCase() || '';
          const saysUnavailable =
            versionText.includes('unavailable') || versionText.includes('indisponible');
          return status.status === 'Down' || saysUnavailable;
        })
        .map(status => status.id)
    );
  }, [scraperStatuses]);

  const isUnavailable = (sourceId: string) => {
    return unavailableSourceIds.has(sourceId);
  };

  useEffect(() => {
    const filtered = selected.filter(sourceId => !isUnavailable(sourceId));
    if (filtered.length !== selected.length) {
      dispatch({ type: 'UPDATE_PREFERENCE', payload: { sr_source: filtered } });
    }
  }, [selected, unavailableSourceIds, dispatch]);

  const toggleSource = (sourceId: string) => {
    const newSources = selected.includes(sourceId)
      ? selected.filter(s => s !== sourceId)
      : [...selected, sourceId];
    dispatch({ type: 'UPDATE_PREFERENCE', payload: { sr_source: newSources } });
  };

  const triggerLabel = () => {
    if (selected.length === 0) return t('select_sources');
    const names = selected.map(id => SOURCES.find(s => s.id === id)?.name).filter(Boolean);
    if (names.length <= 3) return names.join(', ');
    return `${names.length}x`;
  };

  return (
    <div className="dropdown-shell source-picker">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="dropdown-trigger compact">
            <span>{triggerLabel()}</span>
            <svg className="w-3 h-3 text-slate-300" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 5L6 8L9 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-[var(--radix-dropdown-menu-trigger-width)] bg-slate-900/90 border border-white/12 rounded-lg shadow-2xl overflow-hidden z-50"
            sideOffset={8}
          >
            {SOURCES.map(source => {
              const disabled = isUnavailable(source.id);
              return (
              <DropdownMenu.Item
                key={source.id}
                disabled={disabled}
                className={`px-3 py-2 flex items-center gap-2 text-slate-200 hover:bg-sky-500/15 hover:text-white cursor-pointer transition-colors text-sm outline-none ${
                  selected.includes(source.id) ? 'bg-blue-500/15' : ''
                } ${disabled ? 'opacity-45 cursor-not-allowed hover:bg-transparent hover:text-slate-400' : ''}`}
                onSelect={e => {
                  e.preventDefault();
                  if (disabled) return;
                  toggleSource(source.id);
                }}
              >
                <img
                  src={`/img/sources/${source.id}.png`}
                  className="sourceicon w-4 h-4"
                  alt={source.name}
                />
                {source.name}
                {selected.includes(source.id) && (
                  <svg className="w-3 h-3 ml-auto text-sky-400" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </DropdownMenu.Item>
               );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

