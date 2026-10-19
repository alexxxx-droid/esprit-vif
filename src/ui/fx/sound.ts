/**
 * Sons synthétisés à la volée (Web Audio) : aucun fichier audio, rien à télécharger.
 * Un petit studio partagé avec la musique : un compresseur doux et une réverbération légère.
 */
let enabled = true;
let effectsVolume = 0.9;
let context: AudioContext | null = null;
let studio: Studio | null = null;

interface Studio {
  /** Entrée des effets sonores (volume des effets). */
  effects: GainNode;
  /** Entrée de la musique (son volume est réglé par le module musique). */
  music: GainNode;
  /** Départ vers la réverbération. */
  reverb: GainNode;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function setEffectsVolume(value: number) {
  effectsVolume = Math.min(1, Math.max(0, value));
  if (studio && context) studio.effects.gain.setTargetAtTime(effectsVolume, context.currentTime, 0.05);
}

/** Une réverbération maison : un bruit qui s'éteint en deux secondes, assez pour donner de l'air. */
function impulse(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

/** Le contexte audio, créé au premier son (les navigateurs l'exigent après un geste). */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function audioStudio(): { ctx: AudioContext; studio: Studio } | null {
  const ctx = audioContext();
  if (!ctx) return null;
  if (!studio) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    convolver.connect(wet).connect(compressor);
    const reverb = ctx.createGain();
    reverb.connect(convolver);
    const effects = ctx.createGain();
    effects.gain.value = effectsVolume;
    effects.connect(compressor);
    const music = ctx.createGain();
    music.connect(compressor);
    studio = { effects, music, reverb };
  }
  return { ctx, studio };
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  /** Part envoyée dans la réverbération (0 à 1). */
  space?: number;
}

function tone(freq: number, delay: number, duration: number, { type = 'sine', gain = 0.1, slideTo, space = 0.15 }: ToneOptions = {}) {
  if (!enabled) return;
  const audio = audioStudio();
  if (!audio) return;
  const { ctx, studio: out } = audio;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(out.effects);
  if (space > 0) {
    const send = ctx.createGain();
    send.gain.value = space;
    amp.connect(send).connect(out.reverb);
  }
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const arpeggio = (notes: number[], step: number, gain: number) =>
  notes.forEach((f, i) => tone(f, i * step, 0.3, { type: 'triangle', gain, space: 0.3 }));

const semitone = (base: number, steps: number) => base * 2 ** (steps / 12);

/** Série de bonnes réponses : chaque réponse juste d'affilée sonne un cran plus haut. */
let streak = 0;
const STREAK_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

export const sound = {
  tap: () => tone(740, 0, 0.045, { type: 'triangle', gain: 0.04, space: 0 }),
  good: () => {
    const lift = STREAK_STEPS[Math.min(streak, STREAK_STEPS.length - 1)];
    streak++;
    tone(semitone(880, lift), 0, 0.09, { type: 'triangle', gain: 0.07 });
    tone(semitone(1318.5, lift), 0.06, 0.16, { type: 'triangle', gain: 0.07, space: 0.25 });
  },
  bad: () => {
    streak = 0;
    tone(196, 0, 0.18, { type: 'triangle', gain: 0.12, slideTo: 150, space: 0.05 });
  },
  /** Nouvelle partie : la série repart de la note de base. */
  resetStreak: () => {
    streak = 0;
  },
  tick: () => tone(587, 0, 0.09, { type: 'sine', gain: 0.09 }),
  go: () => tone(784, 0, 0.22, { type: 'sine', gain: 0.1, slideTo: 1175, space: 0.3 }),
  /** Note d'une case de la Matrice, plus aiguë selon sa position. */
  note: (index: number) => tone(392 * 2 ** ((index % 12) / 12), 0, 0.28, { type: 'sine', gain: 0.08, space: 0.3 }),
  /** Tintement d'une étoile gagnée (la deuxième et la troisième montent). */
  star: (index: number) => {
    tone(semitone(1046.5, index * 4), 0, 0.35, { type: 'sine', gain: 0.07, space: 0.45 });
    tone(semitone(2093, index * 4), 0.02, 0.25, { type: 'sine', gain: 0.025, space: 0.45 });
  },
  done: () => arpeggio([523.25, 659.25, 783.99], 0.08, 0.07),
  record: () => arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.07, 0.07),
};
