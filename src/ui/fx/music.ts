import type { Domain } from '../../core/types';
import { audioStudio } from './sound';

/**
 * Musique d'ambiance, composée à la volée : une nappe d'accords, une basse douce et un arpège
 * qui improvise sur l'accord du moment. Chaque domaine a sa couleur (accords et tempo).
 */

interface Theme {
  tempo: number;
  /** Accords en notes MIDI ; chacun dure deux mesures. */
  chords: number[][];
  /** Probabilité qu'une croche de l'arpège sonne. */
  density: number;
}

const THEMES: Record<Domain, Theme> = {
  // Lumineux : I – vi – IV – V en do majeur.
  calcul: { tempo: 96, density: 0.55, chords: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 57, 60], [43, 50, 55, 59]] },
  // Rêveur : septièmes majeures, tempo lent.
  memoire: { tempo: 72, density: 0.4, chords: [[41, 48, 57, 64], [40, 47, 55, 62], [38, 45, 53, 60], [36, 43, 52, 59]] },
  // Calme et concentré : la mineur.
  attention: { tempo: 80, density: 0.45, chords: [[45, 52, 57, 60], [41, 48, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59]] },
  // Entraînant : ré mineur, tempo vif.
  vitesse: { tempo: 116, density: 0.6, chords: [[38, 45, 53, 57], [46, 53, 58, 62], [41, 48, 57, 60], [36, 43, 52, 55]] },
  // Chaleureux : sol majeur, couleurs de septième.
  langage: { tempo: 84, density: 0.5, chords: [[43, 50, 59, 62], [40, 47, 55, 62], [36, 43, 52, 59], [38, 45, 54, 57]] },
  // Mystérieux : dorien, accords suspendus.
  logique: { tempo: 76, density: 0.45, chords: [[38, 45, 53, 60], [43, 50, 58, 62], [46, 53, 57, 62], [45, 52, 55, 62]] },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let musicOn = true;
let volume = 0.5;
let playing: { stop: () => void } | null = null;

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (!on) stopMusic();
}

export function setMusicVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  const audio = audioStudio();
  if (audio && playing) audio.studio.music.gain.setTargetAtTime(volume * 0.5, audio.ctx.currentTime, 0.2);
}

function voice(ctx: AudioContext, out: AudioNode, reverb: AudioNode, freq: number, start: number, length: number, kind: 'pad' | 'pluck' | 'bass') {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  if (kind === 'pad') {
    osc.type = 'triangle';
    osc.detune.value = (Math.random() - 0.5) * 12;
    filter.frequency.value = 1100;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(0.035, start + length * 0.35);
    amp.gain.linearRampToValueAtTime(0.0001, start + length);
  } else if (kind === 'bass') {
    osc.type = 'sine';
    filter.frequency.value = 400;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  } else {
    osc.type = 'sine';
    filter.frequency.value = 2600;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(0.05, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  }
  osc.frequency.value = freq;
  osc.connect(filter).connect(amp).connect(out);
  const send = ctx.createGain();
  send.gain.value = kind === 'bass' ? 0.1 : 0.55;
  amp.connect(send).connect(reverb);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** Lance l'ambiance d'un domaine (fondu d'entrée), en remplaçant celle qui jouait. */
export function startMusic(domain: Domain) {
  stopMusic();
  if (!musicOn || volume <= 0) return;
  const audio = audioStudio();
  if (!audio) return;
  const { ctx, studio } = audio;
  const theme = THEMES[domain];
  const eighth = 60 / theme.tempo / 2;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
  bus.connect(studio.music);
  studio.music.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.1);

  let step = 0;
  let nextTime = ctx.currentTime + 0.2;
  let previous = -1;
  const schedule = () => {
    // On prépare un peu d'avance pour que la musique ne bégaie jamais.
    while (nextTime < ctx.currentTime + 0.25) {
      const chord = theme.chords[Math.floor(step / 16) % theme.chords.length];
      if (step % 16 === 0) for (const note of chord) voice(ctx, bus, studio.reverb, hz(note), nextTime, eighth * 16, 'pad');
      if (step % 4 === 0) voice(ctx, bus, studio.reverb, hz(chord[0] - 12), nextTime, eighth * 3, 'bass');
      if (Math.random() < theme.density) {
        const pool = [...chord.slice(1).map((n) => n + 12), chord[1] + 24];
        let pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick === previous) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
        previous = pick;
        voice(ctx, bus, studio.reverb, hz(pick), nextTime, eighth * 2.5, 'pluck');
      }
      step++;
      nextTime += eighth;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 60);
  playing = {
    stop() {
      window.clearInterval(timer);
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + 1.2);
      window.setTimeout(() => bus.disconnect(), 1600);
    },
  };
}

/** Fondu de sortie de l'ambiance en cours. */
export function stopMusic() {
  playing?.stop();
  playing = null;
}
