import { describe, expect, it } from 'vitest';
import { contentOf } from './content';
import { LANGS, PUBLISHED_LANGS, resolveLang, type ExtraLang, type Lang } from './lang';

const isExtra = (l: Lang): l is ExtraLang => l !== 'fr' && l !== 'en';
const FILES = import.meta.glob<unknown>('../i18n/*.json', { eager: true, import: 'default' });
const read = (file: string) => FILES[`../i18n/${file}`];

/**
 * Fichiers des nouveaux jeux pas encore traduits en espagnol, allemand, italien et portugais (choix
 * d'Alex le 21-10-2026 : le français d'abord). En attendant, ces langues les affichent en anglais.
 * Leurs noms sont déjà traduits. À vider dès que leurs textes le sont.
 */
const PENDING_FILES: readonly string[] = ['core/games/compte.ts', 'ui/games/CompteGame.tsx', 'ui/games/compte-demo.tsx', 'core/games/echo.ts', 'ui/games/EchoGame.tsx', 'ui/games/echo-demo.tsx', 'core/games/miroir.ts', 'ui/games/MiroirGame.tsx', 'ui/games/miroir-demo.tsx', 'core/games/code.ts', 'ui/games/CodeGame.tsx', 'ui/games/code-demo.tsx', 'core/games/combien.ts', 'ui/games/CombienGame.tsx', 'ui/games/combien-demo.tsx', 'core/games/motsmeles.ts', 'ui/games/MelesGame.tsx', 'ui/games/meles-demo.tsx', 'core/games/aiguillages.ts', 'ui/games/AiguillagesGame.tsx', 'ui/games/aiguillages-demo.tsx', 'core/games/symboles.ts', 'ui/games/SymbolesGame.tsx', 'ui/games/symboles-demo.tsx', 'core/games/regle.ts', 'ui/games/RegleGame.tsx', 'ui/games/regle-demo.tsx', 'core/games/grand.ts', 'ui/games/GrandGame.tsx', 'ui/games/grand-demo.tsx'];

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
    const entries = read('source.json') as { key: string; at: string[] }[];
    const dict = read(`${l}.json`) as Record<string, string>;
    const pending = (e: { at: string[] }) => e.at.every((at) => PENDING_FILES.some((file) => at.startsWith(`src/${file}:`)));
    expect(entries.filter((e) => !(e.key in dict) && !pending(e)).map((e) => e.key)).toEqual([]);
    expect(contentOf(l)).not.toBeNull();
  });

  it('ne propose que des langues connues', () => {
    for (const l of PUBLISHED_LANGS) expect(LANGS).toContain(l);
  });
});
