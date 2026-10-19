import { haptic } from './haptics';
import { sound } from './sound';

/** Retour sensoriel combiné : son + vibration, chacun désactivable dans les réglages. */
export const fx = {
  tap() {
    sound.tap();
    haptic('tap');
  },
  good() {
    sound.good();
    haptic('good');
  },
  bad() {
    sound.bad();
    haptic('bad');
  },
  /** Début d'une partie : la série de bonnes réponses repart de zéro. */
  start: () => sound.resetStreak(),
  star: (index: number) => sound.star(index),
  tick: () => sound.tick(),
  go: () => sound.go(),
  note: (index: number) => sound.note(index),
  done() {
    sound.done();
    haptic('done');
  },
  record() {
    sound.record();
    haptic('done');
  },
};
