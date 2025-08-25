import { register, init } from 'svelte-i18n';

// Register all translation json files from the public/translations folder.
// Path is relative to this file: src/renderer -> ../../public/translations
const modules = import.meta.glob('../../public/translations/*.json', { eager: true });

Object.entries(modules).forEach(([path, module]) => {
  const filename = path.split('/').pop();
  if (!filename || filename.includes('_source')) return;
  const locale = filename.replace(/\.json$/, '');
  // register() expects a function that returns a promise, so wrap the module
  register(locale, () => Promise.resolve(module.default || module));
});

// Always initialize with English as default to avoid locale detection issues
export const i18nReady = init({
  fallbackLocale: 'en',
  initialLocale: 'en',
});
