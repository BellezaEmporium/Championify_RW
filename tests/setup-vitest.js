import { afterAll, vi, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure global variables before other imports
global.__dirname = __dirname;
global.__filename = fileURLToPath(import.meta.url);

// Mock Electron modules before any other imports that might use them
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(path => {
      const paths = {
        userData: path.join(__dirname, '..', 'tmp', 'userData'),
        appData: path.join(__dirname, '..', 'tmp', 'appData'),
        home: path.join(__dirname, '..', 'tmp', 'home'),
        temp: path.join(__dirname, '..', 'tmp'),
      };
      return paths[path] || '/mock/path';
    }),
    getVersion: vi.fn(() => '3.0.0'),
    getName: vi.fn(() => 'Championify'),
    quit: vi.fn(),
  },
  ipcRenderer: {
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(() => Promise.resolve()),
  },
  shell: {
    openExternal: vi.fn(() => Promise.resolve()),
    showItemInFolder: vi.fn(),
  },
  clipboard: {
    readText: vi.fn(() => ''),
    writeText: vi.fn(),
  },
  dialog: {
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
    showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: [] })),
    showSaveDialog: vi.fn(() => Promise.resolve({ canceled: false, filePath: '' })),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
  },
}));

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    mkdirsSync: vi.fn(),
    ensureDirSync: vi.fn(),
    writeFileAsync: vi.fn(() => Promise.resolve()),
    readFileSync: vi.fn(() => '{"test": true}'),
    existsSync: vi.fn(() => true),
    remove: vi.fn(() => Promise.resolve()),
    removeSync: vi.fn(),
  };
});

// Mock nock for HTTP testing
vi.mock('nock', () => {
  const mockNock = vi.fn(() => ({
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    reply: vi.fn().mockReturnThis(),
    persist: vi.fn().mockReturnThis(),
  }));
  mockNock.cleanAll = vi.fn();
  return { default: mockNock };
});

// Mock msw for modern HTTP testing
vi.mock('msw', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  HttpResponse: {
    text: vi.fn(text => ({ text })),
    json: vi.fn(json => ({ json })),
  },
  setupServer: vi.fn(() => ({
    listen: vi.fn(),
    close: vi.fn(),
    use: vi.fn(),
    resetHandlers: vi.fn(),
  })),
}));

// Configure src path used by tests
global.src_path = process.env.COVERAGE ? 'src-cov/renderer/src' : 'src/renderer/src';

// Load and merge champion translations if fixtures exist
let translationsLoaded = false;

beforeAll(async () => {
  if (!translationsLoaded) {
    try {
      const championsPath = path.join(__dirname, 'fixtures', 'all_champions.json');
      if (fs.existsSync(championsPath)) {
        const championsData = JSON.parse(fs.readFileSync(championsPath, 'utf8'));
        const champions = championsData.data;

        // Try to load the translate module
        try {
          const translatePath = path.join(__dirname, '..', global.src_path, 'translate.js');
          if (fs.existsSync(translatePath)) {
            const { default: T } = await import(translatePath);
            let translations = {};

            for (const [key, value] of Object.entries(champions)) {
              translations[key] = value.name;
            }

            // Convert to lowercase and remove spaces
            const processedTranslations = {};
            for (const [key, value] of Object.entries(translations)) {
              const processedKey = key.toLowerCase().replace(/ /g, '');
              processedTranslations[processedKey] = value;
            }

            processedTranslations.wukong = processedTranslations.monkeyking || 'Wukong';
            T.merge(processedTranslations);
          }
        } catch (translateError) {
          console.log('Could not load translate module:', translateError.message);
        }
      }
    } catch (e) {
      console.log('Error loading fixtures or modules:', e.message);
    }
    translationsLoaded = true;
  }
});

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// If a global coverage object is attached to window by other libs, write it
// after tests finish to the standard coverage location
afterAll(() => {
  try {
    if (global.window && global.window.__coverage__) {
      const file_path = path.resolve(process.cwd(), 'coverage/coverage.json');
      fs.mkdirSync(path.dirname(file_path), { recursive: true });
      fs.writeFileSync(file_path, JSON.stringify(global.window.__coverage__));
    }
  } catch (err) {
    console.log('Error writing coverage file:', err);
  }
});
