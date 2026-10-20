import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PlayOutcome } from '../core/types';
import { mergeProgress } from './merge';
import { ProgressStore, type ProgressData } from './progress';
import { createMemoryStorage } from './storage';

const outcome = (score: number): PlayOutcome => ({ score, stats: {}, headline: `${score} pts`, lines: [] });

async function device() {
  return ProgressStore.load(createMemoryStorage());
}

/** Le contenu comparable d'une progression (sans les réglages de l'appareil). */
const content = (d: ProgressData) => JSON.stringify({ plays: d.plays, tests: d.tests, games: d.games, extras: d.extras });

describe('fusion de deux appareils', () => {
  it('additionne les parties et garde le meilleur de chaque jeu, sans rien perdre', async () => {
    const phone = await device();
    const tablet = await device();
    await phone.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 1, outcome: outcome(90) }, new Date('2026-10-18T10:00:00Z'));
    await phone.recordPlay({ gameId: 'calcul', level: 2, mode: 'free', seed: 2, outcome: outcome(70) }, new Date('2026-10-18T10:05:00Z'));
    await tablet.recordPlay({ gameId: 'calcul', level: 1, mode: 'free', seed: 3, outcome: outcome(95) }, new Date('2026-10-19T09:00:00Z'));
    await tablet.recordPlay({ gameId: 'matrice', level: 1, mode: 'free', seed: 4, outcome: outcome(60) }, new Date('2026-10-19T09:10:00Z'));
    await tablet.recordMarathon('calcul', 300);
    await phone.recordMarathon('calcul', 250);
    await phone.recordMarathon('calcul', 260);

    const merged = mergeProgress(phone.getSnapshot(), tablet.getSnapshot());
    expect(merged.plays).toHaveLength(4);
    expect(merged.games.calcul?.bests['1'].score).toBe(95);
    expect(merged.games.calcul?.bests['2'].score).toBe(70);
    expect(merged.games.matrice?.bests['1'].score).toBe(60);
    expect(merged.games.calcul?.level).toBe(3);
    expect(merged.extras.marathons.calcul).toEqual({ best: 300, count: 2 });
  });

  it('donne le même résultat dans les deux sens, et ne bouge plus quand on refusionne', async () => {
    const a = await device();
    const b = await device();
    await a.recordPlay({ gameId: 'stroop', level: 1, mode: 'free', seed: 1, outcome: outcome(80) }, new Date('2026-10-18T10:00:00Z'));
    await b.recordPlay({ gameId: 'schulte', level: 1, mode: 'free', seed: 2, outcome: outcome(50) }, new Date('2026-10-18T11:00:00Z'));
    await a.completeSession('2026-10-18');
    await b.completeSession('2026-10-19');
    const ab = mergeProgress(a.getSnapshot(), b.getSnapshot());
    const ba = mergeProgress(b.getSnapshot(), a.getSnapshot());
    expect(content(ab)).toBe(content(ba));
    expect(content(mergeProgress(ab, ab))).toBe(content(ab));
    expect(content(mergeProgress(ab, b.getSnapshot()))).toBe(content(ab));
    expect(ab.extras.sessions).toEqual(['2026-10-18', '2026-10-19']);
  });

  it('garde les réglages de l’appareil, mais pas l’accueil à refaire', async () => {
    const a = await device();
    const b = await device();
    await a.updateSettings({ theme: 'dark', onboarded: false });
    await b.updateSettings({ theme: 'light', onboarded: true, goals: ['memoire'] });
    const merged = mergeProgress(a.getSnapshot(), b.getSnapshot());
    expect(merged.settings.theme).toBe('dark');
    expect(merged.settings.onboarded).toBe(true);
    expect(merged.settings.goals).toEqual(['memoire']);
  });
});
