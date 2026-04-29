'use client';

import { useCallback } from 'react';

export default function DarwinControls() {
  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().close();
  }, []);

  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  }, []);

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={handleClose}
        className="sys_button w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
        aria-label="Close window"
      />
      <button
        onClick={handleMinimize}
        className="sys_button w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
        aria-label="Minimize window"
      />
      <button
        className="sys_button w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
        aria-label="Maximize window"
      />
    </div>
  );
}

