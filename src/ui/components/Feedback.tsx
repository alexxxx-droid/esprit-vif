import { Icon } from './Icon';
import type { Mark } from './feedback-state';

/** Coche ou croix qui apparaît brièvement après chaque réponse (forme + couleur, jamais la couleur seule). */
export function FeedbackMark({ mark }: { mark: Mark | null }) {
  if (!mark) return null;
  const good = mark.kind === 'good';
  return (
    <div key={mark.id} className={`mark mark--${mark.kind}`} role="status">
      <span className="mark__disc">
        <Icon name={good ? 'check' : 'close'} size={40} strokeWidth={3} />
      </span>
      {mark.detail && <span className="mark__detail">{mark.detail}</span>}
      <span className="sr-only">{good ? 'Juste' : `Erreur${mark.detail ? ` ${mark.detail}` : ''}`}</span>
    </div>
  );
}
