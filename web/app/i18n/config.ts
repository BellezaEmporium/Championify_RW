export const SUPPORTED_LOCALES = [
  'en', 'ar', 'bg', 'bs', 'ca', 'cs', 'da', 'de', 'el', 'es',
  'fi', 'fr', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ka',
  'km', 'ko', 'lt', 'lv', 'ms', 'nl', 'no', 'pl', 'pt', 'pt-BR',
  'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'th', 'tr', 'vi', 'zh-CN', 'zh-TW',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_TO_COUNTRY: Record<string, string> = {
  en: 'GB', fr: 'FR', de: 'DE', es: 'ES', it: 'IT', pt: 'PT',
  'pt-BR': 'BR', ru: 'RU', pl: 'PL', tr: 'TR', vi: 'VN',
  'zh-CN': 'CN', 'zh-TW': 'TW', ko: 'KR', ja: 'JP', ar: 'SA',
  id: 'ID', ms: 'MY', nl: 'NL', sv: 'SE', fi: 'FI', no: 'NO',
  da: 'DK', cs: 'CZ', sk: 'SK', sl: 'SI', hr: 'HR', sr: 'RS',
  bg: 'BG', hu: 'HU', el: 'GR', he: 'IL', hi: 'IN', th: 'TH',
  bs: 'BA', ca: 'ES', ka: 'GE', km: 'KH', lt: 'LT', lv: 'LV',
  ro: 'RO',
};

const localeSet = new Set<string>(SUPPORTED_LOCALES);

export function normalizeLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const cleaned = locale.toString().replace('_', '-').toLowerCase();

  // Exact match
  for (const supported of SUPPORTED_LOCALES) {
    if (supported.toLowerCase() === cleaned) return supported;
  }

  // Base language fallback
  const base = cleaned.split('-')[0];
  for (const supported of SUPPORTED_LOCALES) {
    if (supported.toLowerCase() === base) return supported;
  }

  return null;
}

export function resolveLocale(
  preferredLocale?: string | null,
  osLocale?: string | null,
  fallback: string = DEFAULT_LOCALE
): SupportedLocale {
  return (
    (normalizeLocale(preferredLocale) as SupportedLocale) ||
    (normalizeLocale(osLocale) as SupportedLocale) ||
    (normalizeLocale(fallback) as SupportedLocale) ||
    DEFAULT_LOCALE
  );
}

export function isSupported(locale: string): boolean {
  return localeSet.has(locale);
}
