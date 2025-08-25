import { writable, derived } from 'svelte/store';

// Core application state
export const browseTitle = writable('');
export const sourcesInfo = writable([]);
export const selectedSources = writable('');
export const lolVersion = writable('');
export const sourceVersions = writable({});
export const importProgress = writable(0);
export const statusLogs = writable([]);
export const undefinedBuilds = writable([]);
export const isImporting = writable(false);
export const platform = writable('');
export const locale = writable('en');
export const errorMessage = writable('');

// Derived stores
export const selectedSourcesArray = derived(
  selectedSources,
  $selectedSources => $selectedSources ? $selectedSources.split(',').filter(Boolean) : []
);

// Initialize browse title based on platform
export function initBrowseTitle(platformName) {
  const title = platformName === 'darwin' 
    ? 'Select League of Legends.app'
    : 'Select League of Legends directory';
  browseTitle.set(title);
  platform.set(platformName);
}

// Helper functions to update multiple stores at once
export function updateSourceVersion(sourceId, version) {
  sourceVersions.update(versions => ({
    ...versions,
    [sourceId]: version
  }));
}

export function setSelectedSources(sources) {
  if (Array.isArray(sources)) {
    selectedSources.set(sources.filter(Boolean).join(','));
  } else if (typeof sources === 'string') {
    selectedSources.set(sources);
  }
}

// Reset functions for view transitions
export function resetMainView() {
  importProgress.set(0);
  statusLogs.set([]);
  isImporting.set(false);
}

export function resetCompleteView() {
  // Sort and format undefined builds for display
  undefinedBuilds.update(builds => 
    builds.sort((a, b) => a.source.localeCompare(b.source))
  );
}