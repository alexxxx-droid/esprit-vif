import { tr } from '../lang';
import { pickLevel, secondsLabel } from '../levels';
import type { Rng } from '../rng';
import { clampScore } from '../scoring';

/**
 * Filature : des disques identiques dans une arène. Quelques-uns sont signalés un instant, puis tout
 * se met à bouger : il faut les suivre des yeux et, quand tout s'arrête, toucher ceux qu'on suivait.
 * C'est le « suivi d'objets multiples » des laboratoires, avec des noms et des visuels maison.
 * Les paliers ajoutent chacun une façon de jouer : des nuages sous lesquels les disques passent cachés
 * (Expert), des à-coups de vitesse et de direction (Maître), puis des leurres qui clignotent pendant
 * le mouvement (Légende).
 *
 * Le mouvement est simulé à pas fixe (60 pas par seconde) à partir de la graine : une même graine
 * donne exactement les mêmes trajectoires, quelle que soit la cadence d'affichage de l'appareil.
 */

/** Essais par partie. */
export const FILATURE_TRIALS = 6;
/** Durée du signalement des disques à suivre (allongée par le temps généreux, raccourcie en maîtrise). */
export const FILATURE_CUE_MS = 1800;
/** Côté de l'arène, dans son propre repère. */
export const FILATURE_ARENA = 100;
/** Rayon d'un disque dans ce repère (≈ 42 px de diamètre sur une arène de 320 px). */
export const FILATURE_R = 6.5;
/** Pas de la simulation. */
export const FILATURE_STEP_MS = 1000 / 60;

export interface FilatureLevel {
  /** Disques à suivre. */
  targets: number;
  /** Disques en tout. */
  dots: number;
  /** Vitesse de base, en unités d'arène par seconde (l'arène fait 100 de côté). */
  speed: number;
  /** Durée du mouvement. */
  moveMs: number;
  /** Nuages opaques sous lesquels les disques passent cachés (0 à 2). */
  clouds: number;
  /** Intervalle moyen entre deux à-coups d'un même disque (0 : pas d'à-coups). */
  joltMs: number;
  /** Leurres : disques (non suivis) qui clignotent brièvement pendant le mouvement. */
  lures: number;
}

const L = (targets: number, dots: number, speed: number, moveMs: number, clouds = 0, joltMs = 0, lures = 0): FilatureLevel => ({
  targets,
  dots,
  speed,
  moveMs,
  clouds,
  joltMs,
  lures,
});

export const FILATURE_LEVELS: readonly FilatureLevel[] = [
  // Débutant : deux puis trois disques à suivre, lentement.
  L(2, 6, 16, 4000),
  L(2, 6, 18, 4000),
  L(2, 7, 20, 4000),
  L(2, 7, 22, 4500),
  L(3, 7, 20, 4500),
  L(3, 7, 22, 4500),
  L(3, 8, 24, 5000),
  L(3, 8, 26, 5000),
  L(3, 8, 28, 5000),
  L(3, 8, 30, 5000),
  // Confirmé : jusqu'à quatre disques parmi dix, plus vite, plus longtemps.
  L(3, 8, 32, 5000),
  L(3, 9, 34, 5000),
  L(3, 9, 36, 5500),
  L(4, 9, 30, 5500),
  L(4, 9, 32, 5500),
  L(4, 10, 34, 5500),
  L(4, 10, 36, 6000),
  L(4, 10, 38, 6000),
  L(4, 10, 40, 6000),
  L(4, 10, 42, 6000),
  // Expert : un nuage, puis deux ; les disques passent dessous, cachés.
  L(3, 9, 34, 5500, 1),
  L(3, 9, 36, 5500, 1),
  L(4, 9, 32, 5500, 1),
  L(4, 10, 34, 5500, 1),
  L(4, 10, 36, 6000, 1),
  L(4, 10, 34, 6000, 2),
  L(4, 10, 36, 6000, 2),
  L(4, 11, 38, 6000, 2),
  L(4, 11, 40, 6000, 2),
  L(4, 11, 42, 6000, 2),
  // Maître : des à-coups de vitesse et de direction, de plus en plus fréquents, puis un nuage en plus.
  L(4, 10, 34, 6000, 0, 1600),
  L(4, 10, 36, 6000, 0, 1500),
  L(4, 11, 36, 6000, 0, 1400),
  L(5, 11, 34, 6000, 0, 1400),
  L(5, 11, 36, 6000, 0, 1300),
  L(5, 11, 38, 6000, 1, 1300),
  L(5, 12, 38, 6000, 1, 1200),
  L(5, 12, 40, 6000, 1, 1100),
  L(5, 12, 42, 6000, 1, 1000),
  L(5, 12, 44, 6000, 1, 900),
  // Légende : tout à la fois, avec des leurres qui clignotent pour détourner le regard.
  L(5, 12, 40, 6000, 1, 1100, 2),
  L(5, 12, 42, 6000, 1, 1000, 2),
  L(5, 13, 42, 6000, 2, 1000, 3),
  L(5, 13, 44, 6000, 2, 950, 3),
  L(6, 13, 40, 6000, 2, 950, 3),
  L(6, 13, 42, 6000, 2, 900, 3),
  L(6, 14, 42, 6000, 2, 900, 4),
  L(6, 14, 44, 6000, 2, 850, 4),
  L(6, 14, 46, 6000, 2, 800, 4),
  L(6, 14, 48, 6000, 2, 800, 5),
];

export function filatureLevel(level: number): FilatureLevel {
  return pickLevel(FILATURE_LEVELS, level);
}

/** « 3 à suivre parmi 8 · 5 s » et les nouveautés du palier. */
export function filatureLevelLabel(level: number): string {
  const c = filatureLevel(level);
  const move = secondsLabel(c.moveMs);
  const base = tr(`${c.targets} à suivre parmi ${c.dots} · ${move}`, `${c.targets} to track out of ${c.dots} · ${move}`);
  const flags = [
    c.clouds && (c.clouds > 1 ? tr('2 nuages', '2 clouds') : tr('1 nuage', '1 cloud')),
    c.joltMs && tr('à-coups', 'sudden turns'),
    c.lures && tr('leurres', 'lures'),
  ].filter(Boolean);
  return [base, ...flags].join(' · ');
}

/** La règle affichée à l'intro. */
export function filatureRule(level: number): string {
  const c = filatureLevel(level);
  const parts = [
    tr(
      `Retiens les ${c.targets} disques entourés, puis suis-les des yeux pendant que tout bouge. Quand tout s’arrête, touche-les. ${FILATURE_TRIALS} essais.`,
      `Remember the ${c.targets} circled discs, then follow them with your eyes while everything moves. When it all stops, tap them. ${FILATURE_TRIALS} rounds.`,
    ),
  ];
  if (c.clouds) parts.push(tr('Les disques passent sous les nuages : ne les perds pas !', 'Discs slip under the clouds: don’t lose them!'));
  if (c.joltMs) parts.push(tr('Gare aux à-coups : ils changent soudain de vitesse et de direction.', 'Watch for sudden turns: they change speed and direction without warning.'));
  if (c.lures) parts.push(tr('Des leurres clignotent : ne les suis pas.', 'Lures flash on and off: don’t follow them.'));
  return parts.join(' ');
}

export interface FilatureCloud {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FilatureLure {
  disc: number;
  /** Début et durée du clignotement, en millisecondes depuis le début du mouvement. */
  at: number;
  ms: number;
}

export interface FilatureTrial {
  /** Les disques à suivre (indices). */
  targets: number[];
  /** Positions de chaque disque à chaque pas : [x0, y0, x1, y1, …]. Le premier pas est la position de départ. */
  frames: number[][];
  clouds: FilatureCloud[];
  lures: FilatureLure[];
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Vitesse propre du disque : elle ne change qu'aux à-coups. */
  speed: number;
  nextJolt: number;
}

const MIN = FILATURE_R;
const MAX = FILATURE_ARENA - FILATURE_R;

/** Des positions de départ qui ne se chevauchent pas, avec un peu d'air entre les disques. */
function place(rng: Rng, count: number): { x: number; y: number }[] {
  for (let gap = 2.6; ; gap -= 0.2) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const out: { x: number; y: number }[] = [];
      for (let tries = 0; out.length < count && tries < 600; tries++) {
        const p = { x: MIN + rng.next() * (MAX - MIN), y: MIN + rng.next() * (MAX - MIN) };
        if (out.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= FILATURE_R * gap)) out.push(p);
      }
      if (out.length === count) return out;
    }
  }
}

/** Un nuage aux bords de l'arène ou en son milieu, assez grand pour cacher un disque entier. */
function cloudsFor(rng: Rng, count: number): FilatureCloud[] {
  const clouds: FilatureCloud[] = [];
  for (let i = 0; i < count; i++) {
    const w = 30 + rng.int(0, 8);
    const h = 22 + rng.int(0, 6);
    // Deux nuages : l'un dans la moitié haute, l'autre dans la moitié basse, pour ne pas se recouvrir.
    const top = count === 1 ? 20 + rng.int(0, 60 - h) : i === 0 ? 8 + rng.int(0, 40 - h) : 52 + rng.int(0, 40 - h);
    clouds.push({ x: 8 + rng.int(0, 84 - w), y: Math.max(4, top), w, h });
  }
  return clouds;
}

function setSpeed(body: Body) {
  const norm = Math.hypot(body.vx, body.vy) || 1;
  body.vx = (body.vx / norm) * body.speed;
  body.vy = (body.vy / norm) * body.speed;
}

export function generateFilatureTrial(rng: Rng, level: number): FilatureTrial {
  const c = filatureLevel(level);
  const starts = place(rng, c.dots);
  const bodies: Body[] = starts.map((p) => {
    const angle = rng.next() * Math.PI * 2;
    const speed = c.speed * (0.85 + rng.next() * 0.3);
    return {
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      nextJolt: c.joltMs ? c.joltMs * (0.4 + rng.next() * 0.9) : Infinity,
    };
  });
  const targets = rng.shuffle(Array.from({ length: c.dots }, (_, i) => i)).slice(0, c.targets).sort((a, b) => a - b);
  const clouds = cloudsFor(rng, c.clouds);
  const others = Array.from({ length: c.dots }, (_, i) => i).filter((i) => !targets.includes(i));
  const lures: FilatureLure[] = Array.from({ length: c.lures }, (_, k) => ({
    disc: others[rng.int(0, others.length - 1)],
    // Répartis sur le mouvement, jamais dans la toute première ni la toute dernière seconde.
    at: Math.round(1000 + ((k + rng.next() * 0.8) / c.lures) * (c.moveMs - 2200)),
    ms: 420,
  }));

  const steps = Math.ceil(c.moveMs / FILATURE_STEP_MS);
  const dt = FILATURE_STEP_MS / 1000;
  const snapshot = () => bodies.flatMap((b) => [Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100]);
  const frames: number[][] = [snapshot()];
  for (let step = 1; step <= steps; step++) {
    const now = step * FILATURE_STEP_MS;
    for (const b of bodies) {
      // À-coup : nouvelle direction (franc virage) et nouvelle vitesse, autour de la vitesse de base.
      if (now >= b.nextJolt) {
        const turn = (Math.PI / 3 + rng.next() * (Math.PI / 2)) * (rng.chance(0.5) ? 1 : -1);
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        [b.vx, b.vy] = [b.vx * cos - b.vy * sin, b.vx * sin + b.vy * cos];
        b.speed = c.speed * (0.6 + rng.next() * 0.9);
        setSpeed(b);
        b.nextJolt = now + c.joltMs * (0.6 + rng.next() * 0.8);
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Rebonds sur les bords.
      if (b.x < MIN) [b.x, b.vx] = [2 * MIN - b.x, Math.abs(b.vx)];
      if (b.x > MAX) [b.x, b.vx] = [2 * MAX - b.x, -Math.abs(b.vx)];
      if (b.y < MIN) [b.y, b.vy] = [2 * MIN - b.y, Math.abs(b.vy)];
      if (b.y > MAX) [b.y, b.vy] = [2 * MAX - b.y, -Math.abs(b.vy)];
    }
    // Chocs entre disques : ils rebondissent l'un sur l'autre (masses égales), puis sont écartés.
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        if (dist >= 2 * FILATURE_R) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (approach > 0) {
          a.vx -= approach * nx;
          a.vy -= approach * ny;
          b.vx += approach * nx;
          b.vy += approach * ny;
          setSpeed(a);
          setSpeed(b);
        }
        const push = (2 * FILATURE_R - dist) / 2;
        a.x = Math.min(MAX, Math.max(MIN, a.x - nx * push));
        a.y = Math.min(MAX, Math.max(MIN, a.y - ny * push));
        b.x = Math.min(MAX, Math.max(MIN, b.x + nx * push));
        b.y = Math.min(MAX, Math.max(MIN, b.y + ny * push));
      }
    }
    frames.push(snapshot());
  }
  return { targets, frames, clouds, lures };
}

/** Les essais d'une partie, tous tirés de la graine. */
export function generateFilature(rng: Rng, level: number): FilatureTrial[] {
  return Array.from({ length: FILATURE_TRIALS }, () => generateFilatureTrial(rng, level));
}

/** Position d'un disque à un pas donné. */
export function discAt(trial: FilatureTrial, step: number, disc: number): { x: number; y: number } {
  const frame = trial.frames[Math.max(0, Math.min(trial.frames.length - 1, step))];
  return { x: frame[disc * 2], y: frame[disc * 2 + 1] };
}

/**
 * Score : 100 quand chaque disque suivi est retrouvé à chaque essai ; un mauvais choix retire la
 * moitié d'une bonne réponse (choisir au hasard ne rapporte presque rien).
 */
export function scoreFilature(correct: number, errors: number, level: number): number {
  const total = filatureLevel(level).targets * FILATURE_TRIALS;
  return clampScore((100 * (correct - 0.5 * errors)) / total);
}
