import { describe, expect, it } from 'vitest';
import { DIGIT_SHAPES, recognizeDigit, type Pt } from './handwriting';
import { createRng } from './rng';

const line = (x1: number, y1: number, x2: number, y2: number, steps = 8): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }));
const arc = (cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 16): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
const path = (...parts: Pt[][]): Pt[] => parts.flat();
// Courbe de Bézier quadratique
const bez = (a: Pt, c: Pt, b: Pt, steps = 12): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y };
  });
const P = (x: number, y: number) => ({ x, y });

// Tracés « à la main », construits autrement que les modèles : une mesure honnête.
const HUMAN: Record<string, Pt[][][]> = {
  '0': [[arc(50, 70, 35, 65, -100, 265, 30)], [path(arc(50, 70, 38, 60, -60, 300, 30))], [bez(P(55, 5), P(-30, 70), P(50, 135)).concat(bez(P(50, 135), P(125, 70), P(50, 8)))]],
  '1': [[line(45, 5, 52, 135)], [path(line(30, 30, 50, 5, 4), line(50, 5, 50, 135))], [line(55, 0, 50, 140), line(30, 140, 75, 140)]],
  '2': [
    [path(bez(P(15, 30), P(50, -20), P(80, 35)), bez(P(80, 35), P(60, 90), P(15, 135)), bez(P(15, 135), P(30, 115), P(30, 128), 4), line(30, 128, 90, 132))],
    [path(bez(P(12, 40), P(45, -10), P(82, 30)), line(82, 30, 15, 135), line(15, 135, 88, 135))],
  ],
  '3': [
    [path(bez(P(15, 15), P(85, -5), P(70, 50)), bez(P(70, 50), P(60, 68), P(40, 68), 4), bez(P(40, 68), P(105, 75), P(70, 125)), bez(P(70, 125), P(40, 150), P(12, 120)))],
    [path(line(15, 5, 80, 5), line(80, 5, 45, 55), bez(P(45, 55), P(110, 80), P(60, 130)), bez(P(60, 130), P(30, 145), P(10, 118)))],
  ],
  '4': [
    [path(line(60, 5, 10, 90), line(10, 90, 90, 90)), line(65, 50, 62, 138)],
    [path(line(20, 5, 20, 80), line(20, 80, 88, 80)), line(72, 10, 72, 138)],
  ],
  '5': [
    [path(line(25, 5, 22, 60), bez(P(22, 60), P(95, 40), P(80, 105)), bez(P(80, 105), P(55, 150), P(12, 118))), line(25, 5, 80, 5)],
    [path(line(82, 5, 25, 5), line(25, 5, 20, 58), bez(P(20, 58), P(100, 50), P(75, 115)), bez(P(75, 115), P(45, 145), P(15, 120)))],
  ],
  '6': [
    [path(bez(P(70, 5), P(10, 40), P(18, 105)), bez(P(18, 105), P(35, 145), P(70, 120)), bez(P(70, 120), P(90, 80), P(45, 78)), bez(P(45, 78), P(20, 85), P(20, 105), 4))],
  ],
  '7': [
    [path(line(10, 8, 88, 5), bez(P(88, 5), P(55, 60), P(45, 138)))],
    [path(line(12, 5, 90, 5), line(90, 5, 35, 138)), line(35, 70, 75, 70)],
  ],
  '8': [
    [path(bez(P(80, 20), P(50, -15), P(25, 25)), bez(P(25, 25), P(30, 55), P(60, 75)), bez(P(60, 75), P(95, 105), P(55, 135)), bez(P(55, 135), P(5, 130), P(35, 80)), bez(P(35, 80), P(85, 45), P(80, 20)))],
  ],
  '9': [
    [path(arc(45, 38, 33, 33, 10, -350, 22), bez(P(78, 44), P(80, 100), P(55, 138)))],
    [path(arc(50, 35, 32, 32, -20, -380, 22), line(80, 30, 78, 138))],
  ],
};

type Rng = ReturnType<typeof createRng>;

/** Écriture plus ou moins penchée, étirée et tremblée. */
function jitter(rng: Rng, strokes: readonly (readonly Pt[])[]): Pt[][] {
  const shear = (rng.next() - 0.5) * 0.4;
  const sx = 0.8 + rng.next() * 0.4;
  const wob = 2 + rng.next() * 2;
  return strokes.map((s) => s.map((p) => ({ x: (p.x - 50) * sx + (p.y - 70) * shear + (rng.next() - 0.5) * wob * 2, y: p.y + (rng.next() - 0.5) * wob * 2 })));
}

describe('Écriture au doigt', () => {
  it('reconnaît chaque modèle, même tracé à l’envers ou dans un autre ordre', () => {
    for (const [digit, shapes] of Object.entries(DIGIT_SHAPES)) {
      for (const strokes of shapes) {
        expect(recognizeDigit(strokes)?.digit).toBe(digit);
        expect(recognizeDigit([...strokes].reverse().map((s) => [...s].reverse()))?.digit).toBe(digit);
      }
    }
  });

  it('reconnaît au moins 95 % de chiffres écrits autrement que les modèles', () => {
    const rng = createRng(7);
    let ok = 0;
    let total = 0;
    for (const [digit, shapes] of Object.entries(HUMAN)) {
      let mine = 0;
      for (let k = 0; k < 40; k++) {
        if (recognizeDigit(jitter(rng, shapes[k % shapes.length]))?.digit === digit) mine++;
      }
      expect(mine, `chiffre ${digit}`).toBeGreaterThanOrEqual(34);
      ok += mine;
      total += 40;
    }
    expect(ok / total).toBeGreaterThanOrEqual(0.95);
  });

  it('refuse ce qui n’est pas un chiffre', () => {
    expect(recognizeDigit([])).toBeNull();
    expect(recognizeDigit([[P(10, 10)]])).toBeNull();
    expect(recognizeDigit([line(0, 50, 100, 50, 20)])).toBeNull();
    expect(recognizeDigit([line(0, 0, 100, 100, 20)])).toBeNull();
    expect(recognizeDigit([Array.from({ length: 40 }, (_, i) => P(i * 3, 50 + 20 * Math.sin(i / 3)))])).toBeNull();
  });
});
