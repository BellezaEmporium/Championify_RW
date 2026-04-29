'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type {
  Preferences,
  AppView,
  ProgressEvent,
  LogEntry,
  PathStatus,
  ScraperStatus,
  SourceInfo,
} from '../lib/types';
import * as tauriApi from '../lib/tauri-api';
import { SOURCES, APP_VERSION } from '../lib/sources';

// State

export interface AppState {
  view: AppView;
  preferences: Preferences;
  platform: string;
  locale: string;
  appVersion: string;
  lolVersion: string;
  sources: SourceInfo[];
  scraperStatuses: ScraperStatus[];
  progressLog: LogEntry[];
  pathStatus: PathStatus | null;
  error: string | null;
  loading: boolean;
  initialized: boolean;
}

const defaultPreferences: Preferences = {
  install_path: '',
  sr_source: [],
  aram: false,
  splititems: false,
  skillsformat: false,
  consumables: true,
  consumables_position: 'beginning',
  trinkets: true,
  trinkets_position: 'beginning',
  locksr: false,
  dontdeleteold: false,
  locale: 'en',
};

const initialState: AppState = {
  view: 'main',
  preferences: defaultPreferences,
  platform: 'win32',
  locale: 'en',
  appVersion: APP_VERSION,
  lolVersion: '',
  sources: SOURCES,
  scraperStatuses: [],
  progressLog: [],
  pathStatus: null,
  error: null,
  loading: false,
  initialized: false,
};

// Actions

type AppAction =
  | { type: 'INIT'; payload: Partial<AppState> }
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'SET_PREFERENCES'; payload: Preferences }
  | { type: 'UPDATE_PREFERENCE'; payload: Partial<Preferences> }
  | { type: 'SET_LOCALE'; payload: string }
  | { type: 'SET_PATH_STATUS'; payload: PathStatus | null }
  | { type: 'SET_LOL_VERSION'; payload: string }
  | { type: 'SET_SCRAPER_STATUSES'; payload: ScraperStatus[] }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    case 'UPDATE_PREFERENCE':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    case 'SET_LOCALE':
      return { ...state, locale: action.payload };
    case 'SET_PATH_STATUS':
      return { ...state, pathStatus: action.payload };
    case 'SET_LOL_VERSION':
      return { ...state, lolVersion: action.payload };
    case 'SET_SCRAPER_STATUSES':
      return { ...state, scraperStatuses: action.payload };
    case 'ADD_LOG':
      return { ...state, progressLog: [...state.progressLog, action.payload] };
    case 'CLEAR_LOG':
      return { ...state, progressLog: [] };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// Context

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function useAppState() {
  return useContext(AppStateContext);
}

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}

// Helper to add a log entry
export function addLogEntry(
  dispatch: Dispatch<AppAction>,
  message: string,
  type: 'info' | 'success' | 'error' = 'info'
) {
  dispatch({
    type: 'ADD_LOG',
    payload: {
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    },
  });
}

// Provider

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    async function init() {
      // Detect platform
      let platform = 'win32';
      try {
        const { platform: osPlatform } = await import('@tauri-apps/plugin-os');
        platform = osPlatform();
      } catch {
        // Not in Tauri context
      }

      // Load preferences
      let prefs = defaultPreferences;
      try {
        const loaded = await tauriApi.loadPreferences();
        if (loaded) prefs = loaded;
      } catch (e) {
        console.warn('[AppContext] Failed to load preferences:', e);
      }

      // Get app version
      let appVersion = APP_VERSION;
      try {
        appVersion = await tauriApi.getVersion();
      } catch {
        // Use default
      }

      // Get LoL version
      let lolVersion = '';
      try {
        const v = await tauriApi.getLolVersion();
        if (v && v.toLowerCase() !== 'unknown' && v.toLowerCase() !== 'latest') {
          lolVersion = v.trim();
        }
      } catch {
        // Leave empty
      }

      // Auto-discover LoL path if not set
      let installPath = prefs.install_path;
      let pathStatus: PathStatus | null = null;

      if (!installPath) {
        try {
          installPath = await tauriApi.findLolInstallation();
          pathStatus = { message: 'Found League of Legends!', tone: 'green' };
        } catch {
          pathStatus = { message: 'League of Legends not found', tone: 'red' };
        }
      }

      dispatch({
        type: 'INIT',
        payload: {
          platform,
          preferences: { ...prefs, install_path: installPath || prefs.install_path },
          appVersion,
          lolVersion,
          locale: prefs.locale || 'en',
          pathStatus,
        },
      });

      // Load scraper statuses (non-blocking)
      tauriApi
        .getScraperStatuses()
        .then(statuses => {
          dispatch({ type: 'SET_SCRAPER_STATUSES', payload: statuses });
        })
        .catch(() => {});
    }

    init();
  }, []);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

