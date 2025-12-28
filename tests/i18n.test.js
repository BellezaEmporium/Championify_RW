import { describe, it, expect } from 'vitest';
import { createTranslator, initI18n } from '../src/i18n.js';
import { renderMessage } from '../src/i18n/marko-helpers.js';

function createOut(t, sink) {
  return {
    global: { t },
    text: value => sink.push({ type: 'text', value }),
    write: value => sink.push({ type: 'write', value }),
  };
}

describe('i18n rendering', () => {
  it('renders English strings', async () => {
    const i18n = await initI18n('en');
    const t = createTranslator(i18n);
    const sink = [];
    const out = createOut(t, sink);

    renderMessage(out, { key: 'browse' });
    expect(sink[0]).toMatchObject({ type: 'text', value: 'Browse' });
  });

  it('renders French strings', async () => {
    const i18n = await initI18n('fr');
    const t = createTranslator(i18n);
    const sink = [];
    const out = createOut(t, sink);

    renderMessage(out, { key: 'browse' });
    expect(sink[0]).toMatchObject({ type: 'text', value: 'Parcourir' });
  });

  it('returns the key when a translation is missing', async () => {
    const i18n = await initI18n('en');
    const t = createTranslator(i18n);
    const sink = [];
    const out = createOut(t, sink);

    renderMessage(out, { key: 'missing.translation.key' });
    expect(sink[0]).toMatchObject({ type: 'text', value: 'missing.translation.key' });
  });

  it('allows trusted HTML when escape is false', async () => {
    const i18n = await initI18n('en');
    i18n.addResource('en', 'translation', 'test.html', '<strong>hi</strong>');
    const t = createTranslator(i18n);
    const sink = [];
    const out = createOut(t, sink);

    renderMessage(out, { key: 'test.html', escape: false });
    expect(sink[0]).toMatchObject({ type: 'write', value: '<strong>hi</strong>' });

    sink.length = 0;
    renderMessage(out, { key: 'test.html' });
    expect(sink[0]).toMatchObject({ type: 'text', value: '<strong>hi</strong>' });
  });
});
