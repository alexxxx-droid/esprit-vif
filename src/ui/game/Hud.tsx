import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { useGameChrome } from './chrome';
import type { GameClock } from './clock';

const oneDecimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Barre du haut pendant la partie : quitter, titre, chrono, progression. */
export function GameHud({ progress, children }: { progress?: number; children?: ReactNode }) {
  const { title, onQuit } = useGameChrome();
  return (
    <header className="hud">
      <button type="button" className="icon-btn" onClick={onQuit} aria-label="Quitter la partie">
        <Icon name="close" />
      </button>
      <p className="hud__title">{title}</p>
      <div className="hud__right">{children}</div>
      {progress !== undefined && (
        <div
          className="hud__progress"
          role="progressbar"
          aria-label="Progression"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
        </div>
      )}
    </header>
  );
}

/** Chronomètre qui monte (temps + pénalités), redessiné à chaque image sans faire re-rendre le jeu. */
export function Stopwatch({ clock }: { clock: GameClock }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      if (ref.current) ref.current.textContent = `${oneDecimal.format(clock.total() / 1000)} s`;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clock]);
  return (
    <span className="chrono" role="timer" aria-label="Chronomètre" ref={ref}>
      0,0 s
    </span>
  );
}

/** Temps restant d'un jeu à durée fixe ; passe en alerte sous les 10 dernières secondes. */
export function TimeLeft({ clock, durationMs }: { clock: GameClock; durationMs: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const left = Math.max(0, durationMs - clock.total());
      if (ref.current) {
        ref.current.textContent = `${Math.ceil(left / 1000)} s`;
        ref.current.classList.toggle('chrono--low', left < 10_000);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [clock, durationMs]);
  return (
    <span className="chrono" role="timer" aria-label="Temps restant" ref={ref}>
      {Math.ceil(durationMs / 1000)} s
    </span>
  );
}
