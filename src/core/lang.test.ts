import { describe, expect, it } from 'vitest';
import { contentOf } from './content';
import { LANGS, PUBLISHED_LANGS, resolveLang, type ExtraLang, type Lang } from './lang';

const isExtra = (l: Lang): l is ExtraLang => l !== 'fr' && l !== 'en';
const FILES = import.meta.glob<unknown>('../i18n/*.json', { eager: true, import: 'default' });
const read = (file: string) => FILES[`../i18n/${file}`];

describe('Langues proposées', () => {
  it('« Auto » suit le téléphone pour chaque langue proposée, et donne l’anglais pour les autres', () => {
    expect(resolveLang('auto', 'fr-FR')).toBe('fr');
    expect(resolveLang('auto', 'en-GB')).toBe('en');
    expect(resolveLang('auto', 'es-MX')).toBe('es');
    expect(resolveLang('auto', 'de-AT')).toBe('de');
    expect(resolveLang('auto', 'it-IT')).toBe('it');
    expect(resolveLang('auto', 'pt-PT')).toBe('pt');
    expect(resolveLang('auto', 'nl-NL')).toBe('en');
    expect(resolveLang('de', 'fr-FR')).toBe('de');
  });

  // Une langue n'est proposée qu'avec tous ses textes et le contenu de ses jeux.
  it.each(PUBLISHED_LANGS.filter(isExtra))('%s : dictionnaire complet et contenu des jeux présent', (l) => {
    const keys = (read('source.json') as { key: string }[]).map((e) => e.key);
    const dict = read(`${l}.json`) as Record<string, string>;
    expect(keys.filter((k) => !(k in dict))).toEqual([]);
    expect(contentOf(l)).not.toBeNull();
  });

  it('ne propose que des langues connues', () => {
    for (const l of PUBLISHED_LANGS) expect(LANGS).toContain(l);
  });
});
