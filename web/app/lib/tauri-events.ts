import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ProgressEvent } from './types';

export function listenToImportProgress(
  callback: (event: ProgressEvent) => void
): Promise<UnlistenFn> {
  return listen<ProgressEvent>('import-progress', (event) => {
    callback(event.payload);
  });
}
