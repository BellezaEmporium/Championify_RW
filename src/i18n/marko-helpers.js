const fallback = key => key;

export function getTranslator(out, provided) {
  if (typeof provided === 'function') return provided;
  if (out?.global?.t) return out.global.t;
  return fallback;
}

export function renderMessage(out, input, providedTranslator) {
  const translate = getTranslator(out, providedTranslator);
  const key = input.key || input.id;
  const options = input.options || input.params;
  const value = key ? translate(key, options) : '';
  const output = value == null || value === '' ? key || '' : value;

  if (input.escape === false) {
    out.write(output);
  } else {
    out.text(output);
  }
}
