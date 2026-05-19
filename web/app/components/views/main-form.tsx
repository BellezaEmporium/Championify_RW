'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAppState, useAppDispatch, addLogEntry } from '../../context/app-context';
import SourcePicker from '../ui/source-picker';
import OptionCheckbox from '../ui/option-checkbox';
import PositionSelect from '../ui/position-select';
import VersionPanel from '../ui/version-panel';
import DeleteModal from '../ui/delete-modal';
import * as tauriApi from '../../lib/tauri-api';
import { listenToImportProgress } from '../../lib/tauri-events';
import type { Preferences } from '../../lib/types';

export default function MainForm() {
  const t = useTranslations();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { preferences, pathStatus, platform } = state;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const browseTitle =
    platform === 'darwin' ? t('inputs.browse_title_macos') : t('inputs.browse_title_default');

  // Update a single preference and auto-save
  const updatePref = useCallback(
    async (update: Partial<Preferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCE', payload: update });
      try {
        const current = { ...state.preferences, ...update };
        await tauriApi.savePreferences(current);
      } catch {
        // Non-critical
      }
    },
    [dispatch, state.preferences]
  );

  // Browse for LoL installation
  const handleBrowse = useCallback(async () => {
    const selected = await tauriApi.browseForDirectory(browseTitle);
    if (selected) {
      updatePref({ install_path: selected });
      try {
        const version = await tauriApi.getLolVersionFromPath(selected);
        dispatch({ type: 'SET_LOL_VERSION', payload: version });
        dispatch({
          type: 'SET_PATH_STATUS',
          payload: { message: 'Found League of Legends!', tone: 'green' },
        });
      } catch {
        dispatch({
          type: 'SET_PATH_STATUS',
          payload: { message: 'Unable to read that directory', tone: 'red' },
        });
      }
    }
  }, [browseTitle, dispatch, updatePref]);

  // Import builds
 const handleImport = useCallback(async () => {
    if (importing) return;

    const path = preferences.install_path;
    const sources = preferences.sr_source;

    if (!path) {
      dispatch({
        type: 'SET_PATH_STATUS',
        payload: { message: t('select_folder'), tone: 'red' },
      });
      return;
    }

    if (sources.length === 0) {
      return;
    }

    setImporting(true);
    dispatch({ type: 'SET_VIEW', payload: 'status' });
    dispatch({ type: 'CLEAR_LOG' });
    addLogEntry(dispatch, 'Starting import...', 'info');

    let unlisten: (() => void) | null = null;

    try {
      unlisten = await listenToImportProgress(event => {
        let msg = '';
        if (event.status === 'fetching') {
          msg = `Fetching builds from ${event.source}...`;
        } else if (event.status === 'complete') {
          msg = `Finished ${event.source} (${event.count ?? 0} builds).`;
        }
        if (msg) addLogEntry(dispatch, msg, 'info');
      });
    } catch {
      // Not in Tauri context — safe to proceed without listener
    }

    try {
      const options = {
        aram: preferences.aram,
        splititems: preferences.splititems,
        skillsformat: preferences.skillsformat,
        consumables: preferences.consumables,
        consumables_position: preferences.consumables_position,
        trinkets: preferences.trinkets,
        trinkets_position: preferences.trinkets_position,
        locksr: preferences.locksr,
        dontdeleteold: preferences.dontdeleteold,
      };

      const result = await tauriApi.importBuilds(sources, options, path);

      if (result.success) {
        addLogEntry(
          dispatch,
          `Import complete! ${result.builds_imported} builds imported.`,
          'success'
        );
        dispatch({ type: 'SET_VIEW', payload: 'done' });
      } else {
        addLogEntry(dispatch, `Import failed: ${result.error}`, 'error');
        dispatch({ type: 'SET_VIEW', payload: 'main' });
      }
    } catch (error) {
      addLogEntry(dispatch, `Error: ${error instanceof Error ? error.message : error}`, 'error');
      dispatch({ type: 'SET_VIEW', payload: 'main' });
    } finally {
      setImporting(false);
      unlisten?.();
    }
  }, [importing, preferences, dispatch, t]);

  // Delete builds
  const handleDelete = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const result = await tauriApi.deleteBuilds(preferences.install_path || undefined);
      if (result.success) {
        setDeleteModalOpen(false);
      } else {
        dispatch({
          type: 'SET_PATH_STATUS',
          payload: { message: `Failed to delete: ${result.error}`, tone: 'red' },
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_PATH_STATUS',
        payload: {
          message: `Error: ${error instanceof Error ? error.message : error}`,
          tone: 'red',
        },
      });
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  }, [preferences.install_path, dispatch]);

  return (
    <>
      <DeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      <div className="main-form">
        {/* Install Path */}
        <div className="input-group">
          <div className="input-label">{browseTitle}</div>
          <div className="input-row">
            <input
              type="text"
              className="text-input"
              placeholder={t('inputs.install_path_placeholder')}
              value={preferences.install_path}
              onChange={e => updatePref({ install_path: e.target.value })}
            />
            <button type="button" className="pill-btn ghost" onClick={handleBrowse}>
              {t('browse')}
            </button>
          </div>
          {pathStatus && (
            <div className="status-line">
              <span className={`msg-${pathStatus.tone}`}>{pathStatus.message}</span>
            </div>
          )}
        </div>

        {/* Source Picker */}
        <div className="input-group">
          <div className="input-label">{t('summoners_rift_source')}</div>
          <SourcePicker />
        </div>

        {/* Options Grid */}
        <div className="options-grid">
          <OptionCheckbox
            id="options_aram"
            label={t('options_aram')}
            tooltip={t('options_aram_tooltip')}
            checked={preferences.aram}
            onChange={v => updatePref({ aram: v })}
          />
          <OptionCheckbox
            id="options_splititems"
            label={t('options_splititems')}
            tooltip={t('options_splititems_tooltip')}
            checked={preferences.splititems}
            onChange={v => updatePref({ splititems: v })}
          />
          <OptionCheckbox
            id="options_skillsformat"
            label={t('options_skillsformat')}
            tooltip={t('options_skillsformat_tooltip')}
            checked={preferences.skillsformat}
            onChange={v => updatePref({ skillsformat: v })}
            hint={t('options_skillsformat_hint')}
          />
          <div className="option-row">
            <OptionCheckbox
              id="options_consumables"
              label={t('options_consumables')}
              tooltip={t('options_consumables_tooltip')}
              checked={preferences.consumables}
              onChange={v => updatePref({ consumables: v })}
            />
            {preferences.consumables && (
              <PositionSelect
                value={preferences.consumables_position}
                onChange={v => updatePref({ consumables_position: v })}
              />
            )}
          </div>
          <div className="option-row">
            <OptionCheckbox
              id="options_trinkets"
              label={t('options_trinkets')}
              tooltip={t('options_trinkets_tooltip')}
              checked={preferences.trinkets}
              onChange={v => updatePref({ trinkets: v })}
            />
            {preferences.trinkets && (
              <PositionSelect
                value={preferences.trinkets_position}
                onChange={v => updatePref({ trinkets_position: v })}
              />
            )}
          </div>
          <OptionCheckbox
            id="options_locksr"
            label={t('options_locksr')}
            tooltip={t('options_locksr_tooltip')}
            checked={preferences.locksr}
            onChange={v => updatePref({ locksr: v })}
          />
          <OptionCheckbox
            id="options_dontdeleteold"
            label={t('options_dontdeleteold')}
            tooltip={t('options_dontdeleteold_tooltip')}
            checked={preferences.dontdeleteold}
            onChange={v => updatePref({ dontdeleteold: v })}
          />
        </div>

        {/* Action Buttons */}
        <div className="btn-row">
          <button className="primary-btn compact" onClick={handleImport} disabled={importing}>
            {t('import')}
          </button>
          <button className="danger-btn compact" onClick={() => setDeleteModalOpen(true)}>
            {t('delete')}
          </button>
        </div>

        {/* Version Panel */}
        <VersionPanel />
      </div>
    </>
  );
}
