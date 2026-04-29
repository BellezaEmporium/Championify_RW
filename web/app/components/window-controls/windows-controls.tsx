'use client';

import { useCallback } from 'react';

export default function WindowsControls() {
  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const isMaximized = await win.isMaximized();
    if (isMaximized) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }, []);

  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().close();
  }, []);

  return (
    <div className="flex gap-1 shrink-0">
      <button
        className="sys_button hover:bg-white/10 p-2 rounded transition-colors"
        onClick={handleMinimize}
        aria-label="Minimize window"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect y="5" width="12" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button
        className="sys_button hover:bg-white/10 p-2 rounded transition-colors"
        onClick={handleMaximize}
        aria-label="Maximize window"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect
            x="1"
            y="1"
            width="10"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </button>
      <button
        className="sys_button hover:bg-red-500/80 p-2 rounded transition-colors"
        onClick={handleClose}
        aria-label="Close window"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

