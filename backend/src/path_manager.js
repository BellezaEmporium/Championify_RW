import fs from 'fs';
import * as glob from 'glob';
import path from 'path';
import * as R from 'ramda';

import store from './store.js';
import T from './translate.js';

/**
 * Finds league installation on OSX and Windows.
 */

function findInstallPath() {
  const user_home = import.meta.env.HOME || import.meta.env.USERPROFILE;
  if (process.platform === 'darwin') {
    if (fs.existsSync('/Applications/League of Legends.app')) {
      return this.setInstallPath(
        null,
        '/Applications/League of Legends.app/',
        'Contents/LoL/Config/Champions/'
      );
    } else if (fs.existsSync(`${user_home}/Applications/League of Legends.app`)) {
      return this.setInstallPath(
        null,
        `${user_home}/Applications/League of Legends.app/`,
        'Contents/LoL/Config/Champions/'
      );
    }
  } else if (fs.existsSync('C:/Riot Games/League Of Legends/LeagueClient.exe')) {
    return this.setInstallPath(
      null,
      'C:/Riot Games/League Of Legends/',
      'Config/Champions/',
      'LeagueClient.exe'
    );
  } else if (fs.existsSync('C:/Riot Games/League Of Legends/lol.launcher.exe')) {
    return this.setInstallPath(
      null,
      'C:/Riot Games/League Of Legends/',
      'Config/Champions/',
      'lol.launcher.exe'
    );
  }
}

/**
 * Function Verifies the users selected install paths. Warns if no League related files/diretories are found.
 * @param {String} User selected path
 */

const hasDOM = typeof document !== 'undefined';
function getEl(id) {
  return hasDOM ? document.getElementById(id) : null;
}
function setMsg(className, text) {
  const el = getEl('input_msg');
  if (!el) return;
  el.removeAttribute('class');
  if (className) el.classList.add(className);
  el.textContent = text || '';
}
function enableBtns() {
  const imp = getEl('import_btn');
  const del = getEl('delete_btn');
  if (imp) imp.classList.remove('disabled');
  if (del) del.classList.remove('disabled');
}

function checkInstallPath(selected_path, done) {
  if (selected_path && !R.is(String, selected_path)) selected_path = selected_path[0];
  try {
    fs.lstatSync(selected_path);
  } catch (error) {
    setMsg('red', error && error.message ? error.message : T.t('invalid_path'));
    return done(new Error('Path not found'), selected_path);
  }

  if (process.platform === 'darwin') {
    const lolContents = path.join(selected_path, 'Contents/LoL/');
    const lolApp = path.join(selected_path, 'League of Legends.app');
    if (fs.existsSync(lolContents)) {
      done(null, selected_path, 'Contents/LoL/Config/Champions/');
    } else if (fs.existsSync(lolApp)) {
      done(null, lolApp, 'Contents/LoL/Config/Champions/');
    } else {
      done(new Error('Path not found'), selected_path);
    }
  } else {
    const newLauncher = path.join(selected_path, 'LeagueClient.exe');
    const oldLauncher = path.join(selected_path, 'lol.launcher.exe');
    const garenaExe = path.join(selected_path, 'lolex.exe');
    const garenaLauncher = glob.sync(path.join(selected_path, 'LoL*Launcher.exe'))[0];

    if (fs.existsSync(newLauncher)) {
      return done(undefined, selected_path, 'Config/Champions/', path.basename(newLauncher));
    }
    if (fs.existsSync(oldLauncher)) {
      return done(undefined, selected_path, 'Config/Champions/', path.basename(oldLauncher));
    }
    if (fs.existsSync(garenaExe)) {
      return done(undefined, selected_path, 'Game/Config/Champions/', path.basename(garenaExe));
    }
    if (garenaLauncher) {
      const garenaApp = glob.sync(path.join(selected_path, 'GameData/Apps/*'))[0];
      const garenaVersion = garenaApp ? path.basename(garenaApp) : '';
      return done(
        undefined,
        selected_path,
        garenaVersion ? `GameData/Apps/${garenaVersion}/Game/Config/Champions/` : '',
        path.basename(garenaLauncher)
      );
    }
    return done(new Error('Path not found'), selected_path);
  }
}

/**
 * Sets the path string for the user to see on the interface.
 * @param {String} Path error. If false explains path error
 * @param {String} Installation path
 * @param {String} Champion folder path relative to Install Path
 * @param {String} Path to league executable
 */

function setInstallPath(path_err, install_path, champ_path, executable) {
  function pathErr() {
    setMsg('yellow', T.t('sure_thats_league'));
    enableBtns();
  }
  function foundLeague() {
    setMsg('green', `${T.t('found')} League of Legends!`);
    enableBtns();
  }

  // Clear message area
  const inputMsg = getEl('input_msg');
  if (inputMsg) {
    inputMsg.removeAttribute('class');
    inputMsg.textContent = '';
  }

  if (!champ_path) {
    if (process.platform === 'darwin') {
      champ_path = 'Contents/LoL/Config/Champions/';
    } else {
      champ_path = 'Config/Champions/';
    }
  }

  store.set('lol_install_path', install_path);
  store.set('lol_champ_path', champ_path);
  store.set('lol_executable', executable);
  store.set('itemset_path', path.join(install_path, champ_path));

  const installInput = getEl('install_path');
  if (installInput) installInput.value = install_path || '';

  if (path_err) return pathErr();
  return foundLeague();
}

export default {
  findInstallPath,
  checkInstallPath,
  setInstallPath,
};
