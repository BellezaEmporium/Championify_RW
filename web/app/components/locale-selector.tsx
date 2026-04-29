'use client';

import { useTranslations } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLocale } from '../i18n/provider';
import { useAppState, useAppDispatch } from '../context/app-context';
import { SUPPORTED_LOCALES, LOCALE_TO_COUNTRY } from '../i18n/config';
import * as tauriApi from '../lib/tauri-api';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

function getFlagEmoji(locale: string): string {
  const country = LOCALE_TO_COUNTRY[locale];
  if (!country) return '\u2753';
  try {
    return getUnicodeFlagIcon(country);
  } catch {
    return '\u2753';
  }
}

export default function LocaleSelector() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const dispatch = useAppDispatch();
  const { platform } = useAppState();

  const handleSelect = async (newLocale: string) => {
    setLocale(newLocale as typeof locale);
    dispatch({ type: 'SET_LOCALE', payload: newLocale });

    try {
      const prefs = await tauriApi.loadPreferences();
      if (prefs) {
        await tauriApi.savePreferences({ ...prefs, locale: newLocale });
      }
    } catch {
      // Non-critical
    }
  };

  return (
    <div className="locale_selector">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="material-btn flex items-center gap-2 px-2 py-1" type="button">
            <span className="flag-icon">{getFlagEmoji(locale)}</span>
            <span className="sr-only">{t('select_language')}</span>
            <svg className="w-3 h-3 text-slate-400" viewBox="0 0 12 12" fill="none">
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
            className="bg-slate-900/95 border border-white/8 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto min-w-[200px] z-50"
            align={platform === 'win32' ? 'start' : 'end'}
            sideOffset={8}
          >
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
              <span className="text-sky-400">&#127760;</span>
              <span className="font-semibold text-white">{t('select_language')}</span>
            </div>
            {SUPPORTED_LOCALES.map(loc => (
              <DropdownMenu.Item
                key={loc}
                className={`px-4 py-2.5 flex items-center gap-2.5 text-slate-300 hover:bg-sky-500/15 hover:text-white cursor-pointer transition-colors outline-none ${
                  locale === loc ? 'bg-sky-500/20 text-white' : ''
                }`}
                onSelect={() => handleSelect(loc)}
              >
                <span className="flag-icon">{getFlagEmoji(loc)}</span>
                {loc}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

