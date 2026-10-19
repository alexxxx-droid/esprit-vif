import { useEffect, useEffectEvent, useState } from 'react';
import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { fx } from '../fx/fx';

const STEP_MS = 750;

export function Countdown({ title, onDone, onQuit }: { title: string; onDone: () => void; onQuit: () => void }) {
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
      <p className="countdown__title">{title}</p>
      <p className="countdown__number" key={count} aria-live="assertive">
        {count}
      </p>
      <p className="countdown__hint">{tr('Prépare-toi…', 'Get ready…')}</p>
    </div>
  );
}
