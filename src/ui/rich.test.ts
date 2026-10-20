import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { rich } from './rich';

const html = (text: string, parts: Parameters<typeof rich>[1]) => renderToStaticMarkup(h('p', null, rich(text, parts)));

describe('rich', () => {
  it('place les éléments à l’endroit de leurs {morceaux}, dans l’ordre de la phrase', () => {
    expect(html('Niveau {level} débloqué !', { level: h('strong', null, 3) })).toBe('<p>Niveau <strong>3</strong> débloqué !</p>');
    expect(html('Tap {tone} {target}', { target: h('b', null, 7), tone: h('i', null, 'orange') })).toBe('<p>Tap <i>orange</i> <b>7</b></p>');
  });

  it('laisse tel quel un morceau inconnu', () => {
    expect(html('a {x} b', {})).toBe('<p>a {x} b</p>');
  });
});
