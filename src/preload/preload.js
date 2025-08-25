import { contextBridge, ipcRenderer, shell } from 'electron';
import path from 'path';

// Expose secure APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Application control
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    getPath: name => ipcRenderer.invoke('app:getPath', name),
    isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
    getChampions: () => ipcRenderer.invoke('getChampions'),
    readFileUtf8: (path) => ipcRenderer.invoke('read-file-utf8', path),
  },

  // Window management
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    hide: () => ipcRenderer.invoke('window:hide'),
    show: () => ipcRenderer.invoke('window:show'),
    focus: () => ipcRenderer.invoke('window:focus'),
    setProgressBar: progress => ipcRenderer.invoke('window:setProgressBar', progress),
    openDevTools: options => ipcRenderer.invoke('window:openDevTools', options),
  },

  // Dialog APIs
  dialog: {
    showOpenDialog: options => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: options => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: options => ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title, content) => ipcRenderer.invoke('dialog:showErrorBox', title, content),
  },

  // Process and system information
  process: {
    platform: process.platform,
    argv: () => ipcRenderer.invoke('process:argv'),
    execPath: () => ipcRenderer.invoke('process:execPath'),
    env: import.meta.env,
    versions: process.versions,
  },

  // File system operations (secure subset)
  fs: {
    exists: path => ipcRenderer.invoke('fs:exists', path),
    readFile: (path, encoding) => ipcRenderer.invoke('fs:readFile', path, encoding),
    writeFile: (path, data, encoding) => ipcRenderer.invoke('fs:writeFile', path, data, encoding),
    mkdir: (path, options) => ipcRenderer.invoke('fs:mkdir', path, options),
    readdir: path => ipcRenderer.invoke('fs:readdir', path),
    stat: path => ipcRenderer.invoke('fs:stat', path),
  },

  // Shell operations
  shell: {
    openExternal: url => shell.openExternal(url),
    openPath: path => shell.openPath(path),
    showItemInFolder: path => shell.showItemInFolder(path),
  },

  // Child process operations (elevated permissions)
  childProcess: {
    spawn: (command, args, options) =>
      ipcRenderer.invoke('childProcess:spawn', command, args, options),
    exec: (command, options) => ipcRenderer.invoke('childProcess:exec', command, options),
  },

  // Auto-updater
  autoUpdater: {
    setFeedURL: url => ipcRenderer.invoke('autoUpdater:setFeedURL', url),
    checkForUpdates: () => ipcRenderer.invoke('autoUpdater:checkForUpdates'),
    quitAndInstall: () => ipcRenderer.invoke('autoUpdater:quitAndInstall'),
    on: (event, callback) => {
      ipcRenderer.on(`autoUpdater:${event}`, callback);
      return () => ipcRenderer.removeListener(`autoUpdater:${event}`, callback);
    },
  },

  // Path utilities
  path: {
    join: (...args) => path.join(...args),
    resolve: (...args) => path.resolve(...args),
    dirname: p => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: p => path.extname(p),
    sep: path.sep,
    delimiter: path.delimiter,
  },

  // IPC Communication
  ipc: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, callback) => {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel, callback) => {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },
  },

  // Environment checks
  isDev: () => ipcRenderer.invoke('app:isDev'),
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',

  // Utility functions for specific app needs
  elevation: {
    elevate: params => ipcRenderer.invoke('elevation:elevate', params),
    isElevated: () => ipcRenderer.invoke('elevation:isElevated'),
  },

  // League of Legends specific utilities
  lol: {
    findInstallPath: () => ipcRenderer.invoke('lol:findInstallPath'),
    validatePath: path => ipcRenderer.invoke('lol:validatePath', path),
    getExecutable: () => ipcRenderer.invoke('lol:getExecutable'),
  },

  // Logging
  log: {
    info: message => ipcRenderer.invoke('log:info', message),
    warn: message => ipcRenderer.invoke('log:warn', message),
    error: message => ipcRenderer.invoke('log:error', message),
    debug: message => ipcRenderer.invoke('log:debug', message),
  },
});