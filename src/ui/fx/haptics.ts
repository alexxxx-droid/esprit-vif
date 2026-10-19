export type HapticKind = 'tap' | 'good' | 'bad' | 'done';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  good: 14,
  bad: [35, 50, 35],
  done: [20, 60, 40],
};

let enabled = true;
let native: ((kind: HapticKind) => void) | null = null;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

/** Dans l'appli Android, la vibration passe par le plugin natif (le WebView ignore navigator.vibrate). */
export function setNativeHaptics(handler: (kind: HapticKind) => void) {
  native = handler;
}

export function hapticsSupported(): boolean {
  return native !== null || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
}

export function haptic(kind: HapticKind) {
  if (!enabled) return;
  if (native) {
    native(kind);
    return;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[kind]);
}
