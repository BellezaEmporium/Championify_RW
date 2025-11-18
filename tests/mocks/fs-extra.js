// Minimal browser-safe mock for fs-extra used in tests
import fs from 'fs';

export const mkdirsSync = () => {};
export const ensureDirSync = () => {};
export const writeFileAsync = () => Promise.resolve();
export const remove = () => Promise.resolve();
export const removeSync = () => {};
export const existsSync = fs.existsSync.bind(fs);
export const readFileSync = fs.readFileSync.bind(fs);
export const writeFileSync = fs.writeFileSync.bind(fs);
export default {
  mkdirsSync,
  ensureDirSync,
  writeFileAsync,
  remove,
  removeSync,
  existsSync,
  readFileSync,
  writeFileSync,
};
