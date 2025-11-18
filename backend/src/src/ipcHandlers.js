import { app, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import championify from './championify.js'; // Your existing championify module
import sources, { sources_info } from './sources/index.js'; // Your existing sources module

const execAsync = promisify(exec);

export function setupChampionifyHandlers(mainWindow) {
  // Return application sources list (used by renderer as selectable sources)
  ipcMain.handle('getChampions', async (event, opts) => {
    // Prefer a precomputed sources_info array exported by the sources module
    try {
      if (Array.isArray(sources_info) && sources_info.length) return sources_info;
      // Fallback: build a simple array from the sources object
      return Object.keys(sources).map(id => ({ id, name: sources[id].source_info?.name || id }));
    } catch (err) {
      console.error('Failed to return sources_info:', err);
      return [];
    }
  });

  // Get LoL version from installation path
  ipcMain.handle('get-lol-version', async (event, lolPath) => {
    try {
      // Try multiple methods to get version

      // Method 1: Check for version file
      const versionFile = path.join(lolPath, 'system.yaml');
      if (
        await fs
          .access(versionFile)
          .then(() => true)
          .catch(() => false)
      ) {
        const content = await fs.readFile(versionFile, 'utf8');
        const versionMatch = content.match(/version:\s*(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      // Method 2: Use championify's getVersion if available
      if (championify.getVersion) {
        return await championify.getVersion();
      }

      // Method 3: Check executable properties (Windows)
      if (process.platform === 'win32') {
        const exePath = path.join(lolPath, 'League of Legends.exe');
        const { stdout } = await execAsync(
          `wmic datafile where name="${exePath.replace(/\\/g, '\\\\')}" get Version`
        );
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get LoL version:', error);
      return null;
    }
  });

  // Get source version
  ipcMain.handle('get-source-version', async (event, sourceId) => {
    try {
      if (sources[sourceId] && sources[sourceId].getVersion) {
        return await sources[sourceId].getVersion();
      }
      return null;
    } catch (error) {
      console.error(`Failed to get version for ${sourceId}:`, error);
      return null;
    }
  });

  ipcMain.handle('delete-all-builds', async (event) => {
    try {
      await championify.delete(true);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete all builds:', error);
      return { success: false, error: error.message };
    }
  });

  // Start the import process
  ipcMain.handle('start-import', async (event, options) => {
    const { sources: selectedSources, path: lolPath, preferences } = options;

    try {
      let currentProgress = 0;
      const results = {
        success: true,
        undefinedBuilds: [],
        errors: [],
      };

      // Send progress updates to renderer
      const sendProgress = progress => {
        currentProgress = progress;
        mainWindow.webContents.send('import-progress', progress);

        // Also update taskbar progress (Windows/Linux)
        mainWindow.setProgressBar(progress / 100);
      };

      const sendLog = message => {
        mainWindow.webContents.send('import-log', message);
      };

      // Process each selected source
      const totalSources = selectedSources.length;
      let processedSources = 0;

      for (const sourceId of selectedSources) {
        const source = sources[sourceId];
        if (!source) {
          sendLog(`Source ${sourceId} not found, skipping...`);
          continue;
        }

        sendLog(`Processing ${source.name || sourceId}...`);

        try {
          // Get builds from source
          const builds = await source.getSr();

          if (!builds || builds.length === 0) {
            sendLog(`No builds found for ${sourceId}`);
            results.undefinedBuilds.push({
              source: sourceId,
              champ: 'all',
              position: 'none',
            });
            continue;
          }

          // Process builds
          const processedBuilds = await championify.processBuilds(builds, {
            source: sourceId,
            path: lolPath,
            preferences,
          });

          // Track undefined builds
          if (processedBuilds.undefined) {
            results.undefinedBuilds.push(...processedBuilds.undefined);
          }

          sendLog(`✓ Completed ${source.name || sourceId}`);
        } catch (error) {
          console.error(`Error processing ${sourceId}:`, error);
          sendLog(`✗ Failed ${sourceId}: ${error.message}`);
          results.errors.push({
            source: sourceId,
            error: error.message,
          });
        }

        processedSources++;
        sendProgress(Math.round((processedSources / totalSources) * 100));
      }

      // Clear progress bar
      mainWindow.setProgressBar(-1);

      return results;
    } catch (error) {
      console.error('Import failed:', error);
      mainWindow.setProgressBar(-1);
      throw error;
    }
  });

  // Note: 'read-file-utf8' is already handled in electron.js
}

// Additional utility handlers that might be needed
export function setupUtilityHandlers() {
  // Store get/set for persistent storage
  const store = new Map();

  ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // Preferences handling
  let preferences = {};

  ipcMain.handle('load-preferences', async () => {
    try {
      const prefsPath = path.join(app.getPath('userData'), 'preferences.json');
      if (
        await fs
          .access(prefsPath)
          .then(() => true)
          .catch(() => false)
      ) {
        const data = await fs.readFile(prefsPath, 'utf8');
        preferences = JSON.parse(data);
      }
      return preferences;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return {};
    }
  });

  ipcMain.handle('save-preferences', async (event, prefs) => {
    try {
      preferences = prefs;
      const prefsPath = path.join(app.getPath('userData'), 'preferences.json');
      await fs.writeFile(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  });
}
