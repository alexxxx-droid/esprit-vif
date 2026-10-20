import { describe, expect, it } from 'vitest';
import { translateSource } from './i18n-plugin';

const dicts = new Map([
  ['es', { "'Réglages'": "'Ajustes'", '`${n} parties`': '`${n} partidas`', "plural(count, 'partie')": "plural(count, 'partida')" }],
  ['de', { "'Réglages'": "'Einstellungen'" }],
]);

describe('greffon des dictionnaires', () => {
  it('ajoute les langues des dictionnaires aux appels tr(), variables comprises', () => {
    const code = "const a = tr('Réglages', 'Settings');\nconst b = tr(`${n} parties`, `${n} games`);\nconst c = tr(plural(count, 'partie'), plural(count, 'game'));";
    const out = translateSource(code, 'x.ts', dicts)!;
    expect(out).toContain("tr('Réglages', 'Settings', { es: 'Ajustes', de: 'Einstellungen' })");
    expect(out).toContain('tr(`${n} parties`, `${n} games`, { es: `${n} partidas` })');
    expect(out).toContain("tr(plural(count, 'partie'), plural(count, 'game'), { es: plural(count, 'partida') })");
  });

  it('complète les objets { fr, en } et laisse le reste intact', () => {
    const code = "const t = { fr: 'Réglages', en: 'Settings' };\nconst u = { fr: 'Inconnu', en: 'Unknown' };\nconst v = tr('Autre', 'Other');";
    const out = translateSource(code, 'x.tsx', dicts)!;
    expect(out).toContain("{ fr: 'Réglages', en: 'Settings', es: 'Ajustes', de: 'Einstellungen' }");
    expect(out).toContain("{ fr: 'Inconnu', en: 'Unknown' }");
    expect(out).toContain("tr('Autre', 'Other');");
    expect(translateSource("const z = 'rien';", 'x.ts', dicts)).toBeNull();
  });
});
