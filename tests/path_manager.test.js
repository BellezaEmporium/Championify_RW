import fs from 'node:fs';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

let pathManager;
beforeAll(async () => {
  // dynamic import to keep using global.src_path like your original file
  pathManager = (await import('../src/main/src/path_manager')).default;
});

const osxDescribe = process.platform === 'darwin' ? describe : describe.skip;
const winDescribe = process.platform === 'win32' ? describe : describe.skip;

describe('src/path_manager', () => {
  osxDescribe('osx: checkInstallPath', () => {
    it('should an error when an invalid path is given', done => {
      const test_path = path.resolve('./');
      pathManager.checkInstallPath(test_path, (err, selected_path) => {
        expect(err).toBeDefined();
        expect(err.message).toBe('Path not found');
        expect(selected_path).toBe(test_path);
        done();
      });
    });

    it('should the correct path when League Of Legends.app is selected', done => {
      fs.mkdirSync('./tmp/League Of Legends.app/Contents/Lol', { recursive: true });
      const test_path = path.resolve('./tmp/League Of Legends.app');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(test_path);
        expect(config_dir).toBe('Contents/LoL/Config/Champions/');
        done();
      });
    });

    it('should the correct path when the Applications directory is selected', done => {
      fs.mkdirSync('./tmp/League Of Legends.app/Contents/Lol', { recursive: true });
      const test_path = path.resolve('./tmp');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(path.join(test_path, 'League of Legends.app'));
        expect(config_dir).toBe('Contents/LoL/Config/Champions/');
        done();
      });
    });
  });

  winDescribe('win: checkInstallPath', () => {
    it('should an error when an invalid path is given', done => {
      const test_path = path.resolve('./');
      pathManager.checkInstallPath(test_path, (err, selected_path) => {
        expect(err).toBeDefined();
        expect(err.message).toBe('Path not found');
        expect(selected_path).toBe(test_path);
        done();
      });
    });

    it('should the correct path for a default League installation - New Launcher', done => {
      fs.mkdirSync('./tmp/0/', { recursive: true });
      fs.writeFileSync('./tmp/0/LeagueClient.exe', '123', 'utf8');
      const test_path = path.resolve('./tmp/0/');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir, executable) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(test_path);
        expect(config_dir).toBe('Config/Champions/');
        expect(executable).toBe('LeagueClient.exe');
        done();
      });
    });

    it('should the correct path for a default League installation - Old Launcher', done => {
      fs.mkdirSync('./tmp/1/', { recursive: true });
      fs.writeFileSync('./tmp/1/lol.launcher.exe', '123', 'utf8');
      const test_path = path.resolve('./tmp/1/');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir, executable) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(test_path);
        expect(config_dir).toBe('Config/Champions/');
        expect(executable).toBe('lol.launcher.exe');
        done();
      });
    });

    it('should the correct path for garena check 1 installation', done => {
      fs.mkdirSync('./tmp/2/', { recursive: true });
      fs.writeFileSync('./tmp/2/lolex.exe', '123', 'utf8');
      const test_path = path.resolve('./tmp/2/');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir, executable) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(test_path);
        expect(config_dir).toBe('Game/Config/Champions/');
        expect(executable).toBe('lolex.exe');
        done();
      });
    });

    it('should the correct path for garena check 2 installation', done => {
      fs.mkdirSync('./tmp/3/GameData/Apps/LoLTH', { recursive: true });
      fs.writeFileSync('./tmp/3/LoLTHLauncher.exe', '123', 'utf8');
      const test_path = path.resolve('./tmp/3');
      pathManager.checkInstallPath(test_path, (err, selected_path, config_dir, executable) => {
        expect(err).toBeUndefined();
        expect(selected_path).toBe(test_path);
        expect(config_dir).toBe('GameData/Apps/LoLTH/Game/Config/Champions/');
        expect(executable).toBe('LoLTHLauncher.exe');
        done();
      });
    });
  });
});
