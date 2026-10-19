import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { dayKey } from '../core/daily';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

/** Le réglage « Moins d'animations » de l'appli s'ajoute à celui du système. */
export const MOTION_EVENT = 'esprit-vif:motion';

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', callback);
  window.addEventListener(MOTION_EVENT, callback);
  return () => {
    media.removeEventListener('change', callback);
    window.removeEventListener(MOTION_EVENT, callback);
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches || document.documentElement.dataset.motion === 'reduce',
    () => false,
  );
}

function subscribeClock(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  document.addEventListener('visibilitychange', callback);
  return () => {
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', callback);
  };
}

/** Jour local courant, mis à jour au passage de minuit. */
export function useToday(): string {
  return useSyncExternalStore(subscribeClock, () => dayKey());
}

/** Minutes écoulées depuis minuit. */
export function useMinuteOfDay(): number {
  return useSyncExternalStore(subscribeClock, () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
}

/** Écoute le clavier tant que `active` est vrai. */
export function useKeyDown(handler: (event: globalThis.KeyboardEvent) => void, active = true) {
  const onKey = useEffectEvent(handler);
  useEffect(() => {
    if (!active) return;
    const listener = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      onKey(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [active]);
}

/** Image courante d'une petite animation en boucle (démonstrations). */
export function useLoop(frameCount: number, intervalMs: number, enabled = true): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frameCount), intervalMs);
    return () => window.clearInterval(id);
  }, [frameCount, intervalMs, enabled]);
  return frame;
}

/** Fait défiler un nombre de 0 à sa valeur (sauf si l'utilisateur préfère moins d'animations). */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduced]);
  return reduced ? target : value;
}

/**
 * Navigation au clavier dans une grille de boutons (flèches, Début, Fin) :
 * une seule case est atteignable par Tab, les flèches déplacent le focus.
 */
export function useGridFocus(columns: number, count: number) {
  const [focused, setFocused] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const move = (index: number) => {
    const next = Math.max(0, Math.min(count - 1, index));
    setFocused(next);
    refs.current[next]?.focus();
  };

  return (index: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[index] = el;
    },
    tabIndex: index === Math.min(focused, count - 1) ? 0 : -1,
    onFocus: () => setFocused(index),
    onKeyDown: (event: KeyboardEvent) => {
      const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
      if (event.key in delta) {
        event.preventDefault();
        move(index + delta[event.key]);
      } else if (event.key === 'Home') {
        event.preventDefault();
        move(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        move(count - 1);
      }
    },
  });
}
