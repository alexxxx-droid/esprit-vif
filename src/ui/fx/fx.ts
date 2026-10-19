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
