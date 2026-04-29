'use client';

import { useCallback } from 'react';
import { useAppState } from '../context/app-context';
import DarwinControls from './window-controls/darwin-controls';
import WindowsControls from './window-controls/windows-controls';
import LocaleSelector from './locale-selector';

export default function Titlebar() {
  const { platform } = useAppState();
  const isMac = platform === 'darwin';
  const isWindows = platform === 'win32' || platform === 'linux';

  return (
    <header
      className="app-chrome flex items-center justify-between px-3 py-2 border border-white/10 rounded-2xl"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        <LocaleSelector />
      </div>
      {isMac && <DarwinControls />}
      {isWindows && <WindowsControls />}
    </header>
  );
}

