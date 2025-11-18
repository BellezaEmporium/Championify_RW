import { describe, it, beforeAll, afterAll } from 'vitest';
import { expect } from 'chai';
import T from '../backend/src/translate.js';

describe('backend/translate (migration)', () => {
  beforeAll(async () => {
    await T.loadPhrases('ko');
  });

  afterAll(async () => {
    await T.loadPhrases('en');
  });

  it('définit bien la locale', () => {
    expect(T.locale).to.equal('ko');
  });

  it('merge les phrases', () => {
    T.merge({ test_phrase: '123' });
    expect(T.t('test_phrase')).to.equal('123');
  });

  it('retourne une fallback quand une phrase n\'existe pas', () => {
    const val = T.t('phrase_inexistante_xyz');
    expect(val).to.be.a('string');
  });

  it('lève une erreur quand une langue n\'existe pas', async () => {
    let threw = false;
    try {
      await T.loadPhrases('klingon');
    } catch {
      threw = true;
    }
    expect(threw).to.be.true;
  });
});
