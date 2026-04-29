// Type definitions for Championify

export interface Preferences {
  install_path: string;
  sr_source: string[];
  aram: boolean;
  splititems: boolean;
  skillsformat: boolean;
  consumables: boolean;
  consumables_position: 'beginning' | 'end';
  trinkets: boolean;
  trinkets_position: 'beginning' | 'end';
  locksr: boolean;
  dontdeleteold: boolean;
  locale: string;
}

export interface ImportPayload {
  sources: string[];
  options: ImportOptions;
  path?: string;
}

export interface ImportOptions {
  aram: boolean;
  splititems: boolean;
  skillsformat: boolean;
  consumables: boolean;
  consumables_position: string;
  trinkets: boolean;
  trinkets_position: string;
  locksr: boolean;
  dontdeleteold: boolean;
}

export interface ImportResult {
  success: boolean;
  builds_imported: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  builds_deleted: number;
  error?: string;
}

export interface CountResult {
  success: boolean;
  count: number;
}

export interface ScraperStatus {
  id: string;
  name: string;
  status: 'Unknown' | 'Available' | 'Down';
  latency_ms?: number;
  last_check?: string;
  error_message?: string;
  retrieved_value?: string;
}

export interface SourceInfo {
  id: string;
  name: string;
}

export type AppView = 'main' | 'status' | 'done' | 'error';

export interface ProgressEvent {
  source: string;
  status: 'fetching' | 'writing' | 'complete';
  count: number;
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

export interface PathStatus {
  message: string;
  tone: 'green' | 'red' | 'yellow' | 'info';
}
