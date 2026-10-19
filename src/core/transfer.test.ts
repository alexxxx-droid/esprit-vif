import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';
import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { decodeTransfer, encodeTransfer, FrameCollector, fromBase32, parseFrame, splitCode, toBase32, transferId, type TransferPayload } from './transfer';

/** Une sauvegarde réaliste : des centaines de parties avec leurs statistiques. */
function bigBackup(plays: number): string {
  const rng = createRng(3);
  const games = ['calcul', 'stroop', 'schulte', 'matrice', 'nback', 'lecture'];
  return JSON.stringify({
    app: 'esprit-vif',
    format: 1,
    plays: Array.from({ length: plays }, (_, i) => ({
      id: `p${i}`,
      gameId: rng.pick(games),
      level: rng.int(1, 20),
      mode: 'free',
      seed: rng.int(0, 2 ** 31),
      score: rng.int(0, 100),
      stats: { correct: rng.int(0, 30), errors: rng.int(0, 5), elapsedMs: rng.int(20000, 90000) },
      headline: `${rng.int(0, 30)} bonnes réponses`,
      at: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000 * 7).toISOString(),
      day: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000 * 7).toISOString().slice(0, 10),
    })),
    tests: [],
    settings: {},
  });
}

const payload = (backup: string): TransferPayload => ({ v: 1, profile: { name: 'Léa', color: 2, character: 'pomme' }, backup });

describe('Transfert par QR code', () => {
  it('écrit et relit la base 32', () => {
    const rng = createRng(1);
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, () => rng.int(0, 255));
      const text = toBase32(bytes);
      expect(text).toMatch(/^[A-Z2-7]*$/);
      expect(fromBase32(text)).toEqual(bytes);
    }
    expect(fromBase32('abc')).toBeNull();
  });

  it('compresse la sauvegarde et la retrouve à l’identique', async () => {
    const backup = bigBackup(300);
    const code = await encodeTransfer(payload(backup));
    expect(code).toMatch(/^EV1:[A-Z2-7]+$/);
    expect(code.length).toBeLessThan(backup.length / 2);
    expect(await decodeTransfer(code)).toEqual(payload(backup));
    expect(await decodeTransfer(`  ${code.toLowerCase()}\n`)).toEqual(payload(backup));
    expect(await decodeTransfer('EV1:ABCDEFG')).toBeNull();
    expect(await decodeTransfer('bonjour')).toBeNull();
  });

  it('rassemble les images reçues dans le désordre, avec doublons et intrus', async () => {
    const code = await encodeTransfer(payload(bigBackup(120)));
    const frames = splitCode(code, transferId(createRng(2).next));
    expect(frames.length).toBeGreaterThan(1);
    const collector = new FrameCollector();
    const rng = createRng(9);
    collector.add('EV1:ZZZZ:0:2:AAAA');
    for (const f of rng.shuffle([...frames, ...frames.slice(0, 3)])) collector.add(f);
    expect(collector.add(frames[0])).toBe(false);
    expect(collector.complete).toBe(true);
    expect(collector.code()).toBe(code);
    expect(parseFrame('EV1:ABCD:5:3:AAA')).toBeNull();
  });

  it('tient chaque image dans un QR code lisible, relu ensuite comme par l’appareil photo', async () => {
    const code = await encodeTransfer(payload(bigBackup(80)));
    for (const frame of splitCode(code, 'ABCD').slice(0, 3)) {
      const qr = qrcode(0, 'L');
      qr.addData(frame, 'Alphanumeric');
      qr.make();
      const modules = qr.getModuleCount();
      expect(modules).toBeLessThanOrEqual(89);
      // L'image du QR code, 4 pixels par module avec une marge, comme une photo nette d'écran.
      const scale = 4;
      const size = (modules + 8) * scale;
      const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
      for (let r = 0; r < modules; r++)
        for (let c = 0; c < modules; c++) {
          if (!qr.isDark(r, c)) continue;
          for (let y = 0; y < scale; y++)
            for (let x = 0; x < scale; x++) {
              const i = ((r + 4) * scale + y) * size * 4 + ((c + 4) * scale + x) * 4;
              pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
            }
        }
      expect(jsQR(pixels, size, size)?.data).toBe(frame);
    }
  });
});
