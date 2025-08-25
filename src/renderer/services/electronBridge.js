import {
  browseTitle,
  sourcesInfo,
  selectedSources,
  lolVersion,
  sourceVersions,
  updateSourceVersion,
  initBrowseTitle,
  setSelectedSources,
  platform,
  undefinedBuilds,
  isImporting,
  importProgress,
  statusLogs,
} from '../stores/app.js';
import { get } from 'svelte/store';

class ElectronBridge {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
  }

  async initialize() {
    this.isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
    if (!this.isElectron) {
      console.log("[DEBUG] You are currently running in browser mode. The bridge doesn't exist.");
      return true;
    }

    try {
      // Get platform info
      const platformName = window.electronAPI?.process?.platform || 'unknown';
      initBrowseTitle(platformName);

      // Load preferences from localStorage or config file
      const prefs = await this.loadPreferences();
      if (prefs?.options?.sr_source) {
        setSelectedSources(prefs.options.sr_source);
      }

      // Load sources info using the Champions API
      const sources = await window.electronAPI.app?.getChampions?.();
      sourcesInfo.set(sources || []);

      // Try to find and validate LoL installation
      const lolPath = await window.electronAPI.lol.findInstallPath();
      if (lolPath) {
        browseTitle.set(lolPath);
        // Get version from the installation
        const version = await this.getLolVersionFromPath(lolPath);
        if (version) {
          lolVersion.set(version);
        }
      }

      // Load source versions
      await this.loadSourceVersions(sources);

      return true;
    } catch (error) {
      console.error('Error initializing Electron bridge:', error);
      return false;
    }
  }

  async loadPreferences() {
    try {
      // Try to read preferences from app data
      const appDataPath = await window.electronAPI.app.getPath('userData');
      const prefsPath = window.electronAPI.path.join(appDataPath, 'preferences.json');

      if (await window.electronAPI.fs.exists(prefsPath)) {
        const data = await window.electronAPI.fs.readFile(prefsPath, 'utf8');
        return JSON.parse(data);
      }

      // Fallback to localStorage
      const stored = localStorage.getItem('championify_preferences');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      return null;
    }
  }

  async savePreferences(prefs) {
    if (!this.isElectron) {
      console.log('Mock: Saving preferences', prefs);
      localStorage.setItem('championify_preferences', JSON.stringify(prefs));
      return true;
    }

    try {
      // Save to both localStorage and file
      localStorage.setItem('championify_preferences', JSON.stringify(prefs));

      const appDataPath = await window.electronAPI.app.getPath('userData');
      const prefsPath = window.electronAPI.path.join(appDataPath, 'preferences.json');

      await window.electronAPI.fs.writeFile(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }

  async getLolVersionFromPath(lolPath) {
    if (!this.isElectron) return '14.23.1';

    try {
      // Try to read version from League's files
      const versionPaths = [
        window.electronAPI.path.join(lolPath, 'League of Legends.exe'),
        window.electronAPI.path.join(lolPath, 'LeagueClient.exe'),
        window.electronAPI.path.join(lolPath, 'Game', 'League of Legends.exe'),
      ];

      for (const vPath of versionPaths) {
        if (await window.electronAPI.fs.exists(vPath)) {
          // This would need a main process handler to extract version from exe
          // For now, return a placeholder
          return await window.electronAPI.ipc.invoke('get-lol-version', lolPath);
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get LoL version:', error);
      return null;
    }
  }

  async loadSourceVersions(sources) {
    if (!this.isElectron || !sources) return;

    for (const source of sources) {
      try {
        // Try to get version from the source's API
        const version = await window.electronAPI.ipc.invoke('get-source-version', source.id);
        if (version) {
          updateSourceVersion(source.id, version);
        } else {
          updateSourceVersion(source.id, 'N/A');
        }
      } catch (error) {
        console.warn(`Failed to load version for ${source.id}:`, error);
        updateSourceVersion(source.id, 'N/A');
      }
    }
  }

  // Convenience helper to get a single source version (used by renderer components)
  async getSourceVersion(sourceId) {
    if (!this.isElectron) {
      // return a fake but plausible version in browser mode
      return 'dev';
    }

    try {
      const version = await window.electronAPI.ipc.invoke('get-source-version', sourceId);
      return version;
    } catch (err) {
      console.warn(`Failed to get source version for ${sourceId}:`, err);
      return null;
    }
  }

  async selectDirectory() {
    if (!this.isElectron) {
      console.log('Mock: Opening directory selector');
      return 'C:\\Riot Games\\League of Legends';
    }

    try {
      const result = await window.electronAPI.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: get(browseTitle),
        defaultPath: get(browseTitle) || undefined,
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];

        // Validate the path
        const isValid = await window.electronAPI.lol.validatePath(selectedPath);
        if (!isValid) {
          await window.electronAPI.dialog.showMessageBox({
            type: 'warning',
            title: 'Invalid Directory',
            message:
              'The selected directory does not appear to be a valid League of Legends installation.',
            buttons: ['OK'],
          });
          return null;
        }

        return selectedPath;
      }

      return null;
    } catch (error) {
      console.error('Failed to select directory:', error);
      return null;
    }
  }

  async startImport(options) {
    if (!this.isElectron) {
      console.log('Mock: Starting import with options', options);
      return this.mockImport();
    }

    try {
      // Set up progress tracking
      const progressHandler = window.electronAPI.ipc.on('import-progress', progress => {
        importProgress.set(progress);
      });

      const logHandler = window.electronAPI.ipc.on('import-log', message => {
        statusLogs.update(logs => [...logs, message]);
      });

      const result = await window.electronAPI.ipc.invoke('start-import', {
        sources: options.sources,
        path: get(browseTitle),
        preferences: await this.loadPreferences(),
      });

      // Clean up listeners
      progressHandler();
      logHandler();

      if (result.undefinedBuilds) {
        undefinedBuilds.set(result.undefinedBuilds);
      }

      return result;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  async deleteAllBuilds() {
    if (!this.isElectron) {
      console.log('Mock: Deleting all builds');
      return;
    }

    try {
      await window.electronAPI.ipc.invoke('delete-all-builds');
    } catch (error) {
      console.error('Failed to delete all builds:', error);
    }
  }

  async mockImport() {
    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      importProgress.set(i);

      if (i % 20 === 0) {
        statusLogs.update(logs => [...logs, `Processing... ${i}%`]);
      }
    }

    // Simulate some undefined builds
    undefinedBuilds.set([
      { source: 'OP.GG', champ: 'aatrox', position: 'top' },
      { source: 'ProBuilds', champ: 'ahri', position: 'mid' },
    ]);

    return { success: true };
  }

  async openLog() {
    if (!this.isElectron) {
      console.log('Opening log (mock)');
      return;
    }

    const logPath = await window.electronAPI.app.getPath('userData');
    const logFile = window.electronAPI.path.join(logPath, 'logs', 'main.log');

    if (await window.electronAPI.fs.exists(logFile)) {
      return window.electronAPI.shell.openPath(logFile);
    } else {
      await window.electronAPI.dialog.showMessageBox({
        type: 'info',
        title: 'Log File',
        message: 'No log file found.',
        buttons: ['OK'],
      });
    }
  }

  async startLeague() {
    if (!this.isElectron) {
      console.log('Starting League (mock)');
      return;
    }

    try {
      const lolPath = get(browseTitle);
      if (!lolPath) {
        throw new Error('League of Legends path not set');
      }

      const executable = await window.electronAPI.lol.getExecutable();
      if (executable) {
        await window.electronAPI.childProcess.spawn(executable, [], {
          detached: true,
          cwd: lolPath,
        });
      }
    } catch (error) {
      console.error('Failed to start League:', error);
      await window.electronAPI.dialog.showErrorBox(
        'Failed to Start League',
        'Could not start League of Legends. Please make sure the installation path is correct.'
      );
    }
  }

  async checkForUpdates() {
    if (!this.isElectron) {
      console.log('Checking for updates (mock)');
      return { updateAvailable: false };
    }

    try {
      // Set up update event listeners
      const handlers = [];

      handlers.push(
        window.electronAPI.autoUpdater.on('update-available', info => {
          console.log('Update available:', info);
        })
      );

      handlers.push(
        window.electronAPI.autoUpdater.on('update-not-available', info => {
          console.log('No updates available:', info);
        })
      );

      handlers.push(
        window.electronAPI.autoUpdater.on('download-progress', progress => {
          console.log('Download progress:', progress);
          importProgress.set(progress.percent);
        })
      );

      const result = await window.electronAPI.autoUpdater.checkForUpdates();

      // Clean up listeners after check
      handlers.forEach(handler => handler());

      return result;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return { updateAvailable: false, error };
    }
  }

  async openReleaseNotes() {
    const url = 'https://github.com/BellezaEmporium/Championify_RW/releases';

    if (!this.isElectron) {
      window.open(url, '_blank');
      return;
    }

    return window.electronAPI.shell.openExternal(url);
  }

  // Helper method to show error dialog
  async showError(title, message) {
    if (!this.isElectron) {
      console.error(`${title}: ${message}`);
      alert(`${title}\n\n${message}`);
      return;
    }

    return window.electronAPI.dialog.showErrorBox(title, message);
  }

  // Helper method to get app version
  async getAppVersion() {
    if (!this.isElectron) {
      return '1.0.0-dev';
    }

    return window.electronAPI.app.getVersion();
  }
}

export default new ElectronBridge();
