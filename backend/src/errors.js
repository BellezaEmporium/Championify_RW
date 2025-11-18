import os from 'os';
import T from './translate.js';
import SuperError from 'super-error';

const ChampionifyError = SuperError.subclass('ChampionifyError');
/** @type {{[key: string]: any}} */
const errors = { ChampionifyError };

const error_types = [
  'ElevateError',
  'ExternalError',
  'FileWriteError',
  'MissingData',
  'OperationalError',
  'ParsingError',
  'TranslationError',
  'UncaughtException',
  'UpdateError',
];

error_types.forEach(error_name => {
  errors[error_name] = ChampionifyError.subclass(error_name, function () {
    this.type = error_name;
    this.ua = [os.platform(), os.release()].join(' ');
    this.locale = T.locale;
  });
}, error_types);

errors.RequestError = ChampionifyError.subclass(
  'RequestError',
  function (/** @type {any} */ code, /** @type {any} */ url, /** @type {any} */ body) {
    this.code = code;
    this.url = url;
    this.body = body;
    this.type = 'RequestError';
    this.ua = [os.platform(), os.release()].join(' ');
    this.locale = T.locale;
  }
);

export default errors;
