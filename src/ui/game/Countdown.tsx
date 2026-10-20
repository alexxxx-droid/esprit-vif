import { useEffect, useEffectEvent, useState } from 'react';
import { tr } from '../../core/lang';
import type { GameId } from '../../core/types';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { fx } from '../fx/fx';

const STEP_MS = 750;

export function Countdown({ title, gameId, onDone, onQuit }: { title: string; gameId?: GameId; onDone: () => void; onQuit: () => void }) {
  const [count, setCount] = useState(3);
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    fx.tick();
    const id = window.setTimeout(() => {
      if (count > 1) setCount(count - 1);
      else {
        fx.go();
        finish();
      }
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [count]);

  return (
    <div className="countdown">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={onQuit} aria-label={tr('Quitter la partie', 'Quit the game')}>
          <Icon name="close" />
        </button>
      </header>
      {gameId && <GameArt gameId={gameId} size={56} className="countdown__art" />}
      <p className="countdown__title">{title}</p>
      {/* Un cadran qui se vide à chaque seconde, à la couleur du domaine. */}
      <div className="countdown__dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="countdown__track" cx="60" cy="60" r="54" />
          <circle key={count} className="countdown__ring" cx="60" cy="60" r="54" style={{ animationDuration: `${STEP_MS}ms` }} />
        </svg>
        <p className="countdown__number" key={count} aria-live="assertive">
          {count}
        </p>
      </div>
      <p className="countdown__hint">{tr('Prépare-toi…', 'Get ready…')}</p>
    </div>
  );
}
