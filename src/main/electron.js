import { app, BrowserWindow, ipcMain, dialog, autoUpdater } from 'electron';
import { spawn, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import championify from './src/championify.js';
import { setupChampionifyHandlers, setupUtilityHandlers } from './src/ipcHandlers.js';
import process from 'process';

let main_window;

// Security: Validate file paths to prevent directory traversal
function isPathSafe(filePath) {
  const resolved = path.resolve(filePath);
  const appRoot = path.resolve(__dirname, '../../..');
  return (
    resolved.startsWith(appRoot) ||
    resolved.startsWith(app.getPath('userData')) ||
    resolved.startsWith(app.getPath('documents'))
  );
}

// IPC Handlers for App
ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getName', () => {
  return app.getName();
});

ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:isPackaged', () => {
  return app.isPackaged;
});

ipcMain.handle('app:isDev', () => {
  return import.meta.env.NODE_ENV === 'development' || !app.isPackaged;
});

// IPC Handlers for Window
ipcMain.handle('window:minimize', () => {
  if (main_window) main_window.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (main_window) {
    if (main_window.isMaximized()) {
      main_window.unmaximize();
    } else {
      main_window.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (main_window) main_window.close();
});

ipcMain.handle('window:hide', () => {
  if (main_window) main_window.hide();
});

ipcMain.handle('window:show', () => {
  if (main_window) main_window.show();
});

ipcMain.handle('window:focus', () => {
  if (main_window) main_window.focus();
});

ipcMain.handle('window:setProgressBar', (event, progress) => {
  if (main_window) main_window.setProgressBar(progress);
});

ipcMain.handle('window:openDevTools', (event, options) => {
  if (main_window) main_window.webContents.openDevTools(options);
});

ipcMain.handle('window:reload', () => {
  if (main_window) main_window.webContents.reload();
});

// IPC Handlers for Dialog
ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
  return await dialog.showOpenDialog(main_window, options);
});

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  return await dialog.showSaveDialog(main_window, options);
});

ipcMain.handle('dialog:showMessageBox', async (event, options) => {
  return await dialog.showMessageBox(main_window, options);
});

ipcMain.handle('dialog:showErrorBox', (event, title, content) => {
  dialog.showErrorBox(title, content);
});

ipcMain.handle('read-file-utf8', async path => {
  return fs.readFile(path, 'utf8');
});

// IPC Handlers for Process
ipcMain.handle('process:argv', () => {
  return process.argv;
});

ipcMain.handle('process:execPath', () => {
  return process.execPath;
});

// IPC Handlers for File System (secure subset)
ipcMain.handle('fs:exists', async (event, filePath) => {
  if (!isPathSafe(filePath)) throw new Error('Path not allowed for security reasons');
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:readFile', async (event, filePath, encoding = 'utf8') => {
  if (!isPathSafe(filePath)) throw new Error('Path not allowed for security reasons');
  return await fs.readFile(filePath, encoding);
});

ipcMain.handle('fs:writeFile', async (event, filePath, data, encoding = 'utf8') => {
  if (!isPathSafe(filePath)) throw new Error('Path not allowed for security reasons');
  return await fs.writeFile(filePath, data, encoding);
});

ipcMain.handle('fs:mkdir', async (event, dirPath, options = { recursive: true }) => {
  if (!isPathSafe(dirPath)) throw new Error('Path not allowed for security reasons');
  return await fs.mkdir(dirPath, options);
});

ipcMain.handle('fs:readdir', async (event, dirPath) => {
  if (!isPathSafe(dirPath)) throw new Error('Path not allowed for security reasons');
  return await fs.readdir(dirPath);
});

ipcMain.handle('fs:stat', async (event, filePath) => {
  if (!isPathSafe(filePath)) throw new Error('Path not allowed for security reasons');
  return await fs.stat(filePath);
});

// IPC Handlers for Child Process
ipcMain.handle('childProcess:spawn', (event, command, args, options) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', error => {
      reject(error);
    });
  });
});

ipcMain.handle('childProcess:exec', (event, command, options) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
});

// IPC Handlers for Auto-updater
ipcMain.handle('autoUpdater:setFeedURL', (event, url) => {
  try {
    autoUpdater.setFeedURL(url);
  } catch (error) {
    console.warn('AutoUpdater not available:', error.message);
  }
});

ipcMain.handle('autoUpdater:checkForUpdates', () => {
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.warn('AutoUpdater not available:', error.message);
  }
});

ipcMain.handle('autoUpdater:quitAndInstall', () => {
  try {
    autoUpdater.quitAndInstall();
  } catch (error) {
    console.warn('AutoUpdater not available:', error.message);
  }
});

// Forward autoUpdater events to renderer
const forwardAutoUpdaterEvent = eventName => {
  try {
    autoUpdater.on(eventName, (...args) => {
      if (main_window) {
        main_window.webContents.send(`autoUpdater:${eventName}`, ...args);
      }
    });
  } catch (error) {
    console.warn(`AutoUpdater event ${eventName} not available:`, error.message);
  }
};

[
  'checking-for-update',
  'update-available',
  'update-not-available',
  'error',
  'update-downloaded',
].forEach(forwardAutoUpdaterEvent);

// IPC Handlers for Elevation
ipcMain.handle('elevation:elevate', async (event, params = []) => {
  const platform = process.platform;

  if (platform !== 'win32' && platform !== 'darwin') {
    throw new Error('Elevation not supported on this platform');
  }

  return new Promise((resolve, reject) => {
    const execPath = process.execPath;
    const args = ['--runned-as-admin'].concat(params);

    let child;
    if (platform === 'win32') {
      const powershellArgs = [
        '-Command',
        `Start-Process -FilePath "${execPath}" -ArgumentList "${args.join(' ')}" -Verb runAs`,
      ];
      child = spawn('powershell.exe', powershellArgs, {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else if (platform === 'darwin') {
      const script = `do shell script "${execPath} ${args.join(
        ' '
      )}" with administrator privileges`;
      child = spawn('osascript', ['-e', script], {
        stdio: 'ignore',
      });
    }

    child.on('error', error => {
      reject(error);
    });

    child.on('close', code => {
      if (code === 0) {
        resolve(true);
        app.quit();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
});

ipcMain.handle('elevation:isElevated', () => {
  return process.argv.includes('--runned-as-admin');
});

// IPC Handlers for League of Legends specific utilities
ipcMain.handle('lol:findInstallPath', async () => {
  // Platform-specific logic to find League of Legends installation
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows registry or common paths
    const commonPaths = [
      'C:\\Riot Games\\League of Legends',
      'C:\\Program Files\\Riot Games\\League of Legends',
      'C:\\Program Files (x86)\\Riot Games\\League of Legends',
    ];

    for (const lolPath of commonPaths) {
      try {
        await fs.access(lolPath);
        return lolPath;
      } catch {
        // Path doesn't exist, continue to next
      }
    }
  } else if (platform === 'darwin') {
    const macPath = '/Applications/League of Legends.app';
    try {
      await fs.access(macPath);
      return macPath;
    } catch {
      // Path doesn't exist
    }
  }

  return null;
});

ipcMain.handle('lol:validatePath', async (event, lolPath) => {
  if (!isPathSafe(lolPath)) return false;

  try {
    const stats = await fs.stat(lolPath);
    if (!stats.isDirectory()) return false;

    // Check for key League of Legends files/folders
    const keyPaths = [path.join(lolPath, 'Game'), path.join(lolPath, 'Config')];

    for (const keyPath of keyPaths) {
      try {
        await fs.access(keyPath);
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('lol:getExecutable', async () => {
  const platform = process.platform;

  if (platform === 'win32') {
    return 'LeagueClient.exe';
  } else if (platform === 'darwin') {
    return 'League of Legends.app';
  }

  return null;
});

// IPC Handlers for Logging
ipcMain.handle('log:info', (event, message) => {
  console.log(`[INFO] ${message}`);
});

ipcMain.handle('log:warn', (event, message) => {
  console.warn(`[WARN] ${message}`);
});

ipcMain.handle('log:error', (event, message) => {
  console.error(`[ERROR] ${message}`);
});

ipcMain.handle('log:debug', (event, message) => {
  if (import.meta.env.NODE_ENV === 'development') {
    console.debug(`[DEBUG] ${message}`);
  }
});

app.on('ready', async () => {
  const preloadPath = process.env.ELECTRON_PRELOAD
    ? process.env.ELECTRON_PRELOAD
    : path.join(__dirname, '../preload/preload.mjs');

  main_window = new BrowserWindow({
    width: 450,
    height: 670,
    center: true,
    resizable: false,
    show: false,
    frame: false,
    title: 'Championify',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  main_window.webContents.on('dom-ready', () => {
    // Open DevTools early in dev
    if (process.env.ELECTRON_RENDERER_URL) {
      try {
        main_window.webContents.openDevTools({ mode: 'detach' });
      } catch {}
    }
  });
  // Show the window when ready; also set a fallback in case the event never fires
  main_window.once('ready-to-show', () => {
    main_window.show();
  });
  setTimeout(() => {
    if (main_window && !main_window.isVisible()) main_window.show();
  }, 4000);

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[main] Loading renderer from', process.env.ELECTRON_RENDERER_URL);
    await main_window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    await main_window.loadFile(indexHtml);
  }

  main_window.on('closed', () => {
    main_window = null;
  });

  // Register IPC handlers used by the Svelte renderer
  try {
    setupChampionifyHandlers(main_window);
    setupUtilityHandlers();
  } catch (err) {
    console.error('Failed to set up IPC handlers:', err);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});
