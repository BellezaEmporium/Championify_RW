import { invoke, isTauri } from '@tauri-apps/api/core';
import type {
  Preferences,
  ImportResult,
  DeleteResult,
  CountResult,
  ScraperStatus,
} from './types';

function isTauriContext(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

function maybeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriContext()) {
    return Promise.reject(
      new Error(`[TauriAPI] Tauri runtime not available (cannot invoke "${command}").`)
    );
  }
  return invoke<T>(command, args);
}

// Preferences
export function loadPreferences(): Promise<Preferences | null> {
  if (!isTauriContext()) return Promise.resolve(null);
  return invoke<Preferences>('load_preferences');
}

export function savePreferences(preferences: Preferences): Promise<void> {
  if (!isTauriContext()) return Promise.resolve();
  return invoke('save_preferences', { preferences });
}

export function getOsLocale(): Promise<string | null> {
  if (isTauriContext()) return invoke<string>('get_os_locale');
  if (typeof navigator !== 'undefined' && navigator.language) {
    return Promise.resolve(navigator.language);
  }
  return Promise.resolve(null);
}

// Paths
export function findLolInstallation(): Promise<string> {
  return maybeInvoke<string>('find_lol_installation');
}

export function getItemSetsPath(lolPath?: string): Promise<string> {
  return maybeInvoke<string>('get_item_sets_path', { lol_path: lolPath ?? null });
}

export function getLolVersionFromPath(path: string): Promise<string> {
  return maybeInvoke<string>('get_lol_version_from_path', { path });
}

export function getLolVersion(): Promise<string> {
  return maybeInvoke<string>('get_lol_version');
}

// Import
export function importBuilds(
  sources: string[],
  options: Record<string, unknown>,
  path?: string
): Promise<ImportResult> {
  return maybeInvoke<ImportResult>('import_builds', {
    payload: { sources, options, path },
  });
}

// Build management
export function deleteBuilds(lolPath?: string): Promise<DeleteResult> {
  return maybeInvoke<DeleteResult>('delete_builds', { lol_path: lolPath ?? null });
}

export function countExistingBuilds(lolPath?: string): Promise<CountResult> {
  return maybeInvoke<CountResult>('count_existing_builds', { lol_path: lolPath ?? null });
}

// Info
export function getAvailableSources(): Promise<Array<{ id: string; name: string }>> {
  return maybeInvoke('get_available_sources');
}

export function getVersion(): Promise<string> {
  return maybeInvoke<string>('get_version');
}

export function getScraperStatuses(): Promise<ScraperStatus[]> {
  return maybeInvoke<ScraperStatus[]>('get_scraper_statuses');
}

// Dialog
export async function browseForDirectory(title: string): Promise<string | null> {
  if (!isTauriContext()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });
  return selected as string | null;
}
