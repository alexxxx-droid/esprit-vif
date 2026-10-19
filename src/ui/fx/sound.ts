/**
 * Petits sons synthétisés à la volée (Web Audio) : aucun fichier audio, rien à télécharger.
 */
let enabled = true;
let context: AudioContext | null = null;

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function tone(freq: number, delay: number, duration: number, { type = 'sine', gain = 0.1, slideTo }: ToneOptions = {}) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const arpeggio = (notes: number[], step: number, gain: number) =>
  notes.forEach((f, i) => tone(f, i * step, 0.22, { type: 'triangle', gain }));

export const sound = {
  tap: () => tone(740, 0, 0.045, { type: 'triangle', gain: 0.04 }),
  good: () => {
    tone(880, 0, 0.09, { type: 'triangle', gain: 0.07 });
    tone(1318.5, 0.06, 0.14, { type: 'triangle', gain: 0.07 });
  },
  bad: () => tone(196, 0, 0.18, { type: 'triangle', gain: 0.12, slideTo: 150 }),
  tick: () => tone(587, 0, 0.09, { type: 'sine', gain: 0.09 }),
  go: () => tone(784, 0, 0.2, { type: 'sine', gain: 0.1, slideTo: 1175 }),
  /** Note d'une case de la Matrice, plus aiguë selon sa position. */
  note: (index: number) => tone(392 * 2 ** ((index % 12) / 12), 0, 0.25, { type: 'sine', gain: 0.08 }),
  done: () => arpeggio([523.25, 659.25, 783.99], 0.08, 0.07),
  record: () => arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.07, 0.07),
};
