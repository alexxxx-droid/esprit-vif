import type { ReactNode } from 'react';
import type { GameMeta } from '../../core/games/registry';
import { cheer } from '../../core/outcome';
import type { PlayMode, PlayOutcome } from '../../core/types';
import type { SavedPlay } from '../../store/progress';
import { ScoreRing } from '../components/bits';
import { Icon } from '../components/Icon';

interface GameResultProps {
  meta: GameMeta;
  mode: PlayMode;
  outcome: PlayOutcome;
  saved: SavedPlay;
  children: ReactNode;
}

export function GameResult({ meta, mode, outcome, saved, children }: GameResultProps) {
  const level = saved.play.level;
  return (
    <div className="result screen-in">
      <p className="result__game">
        {meta.name} · niveau {level}
      </p>
      <ScoreRing score={outcome.score} />
      <h1 className="result__cheer">{cheer(outcome.score)}</h1>

      {saved.record === 'new' && (
        <p className="badge badge--record">
          <Icon name="star" size={18} />
          Nouveau record&nbsp;! <span className="badge__aside">avant&nbsp;: {saved.previousBest?.score} pts</span>
        </p>
      )}
      {saved.record === 'first' && (
        <p className="badge">
          <Icon name="star" size={18} />
          Premier score à ce niveau
        </p>
      )}

      <dl className="stat-list">
        {outcome.lines.map((line) => (
          <div key={line.label}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>

      {mode === 'free' && <LevelChange meta={meta} from={level} to={saved.nextLevel} />}

      <div className="result__actions">{children}</div>
    </div>
  );
}

function LevelChange({ meta, from, to }: { meta: GameMeta; from: number; to: number }) {
  if (to > from) {
    return (
      <p className="level-change level-change--up">
        <Icon name="up" size={20} />
        <span>
          Niveau suivant&nbsp;: <strong>{to}</strong> · {meta.levelLabel(to)}
        </span>
      </p>
    );
  }
  if (to < from) {
    return (
      <p className="level-change">
        <Icon name="down" size={20} />
        <span>
          On souffle un peu&nbsp;: prochaine partie au niveau <strong>{to}</strong> · {meta.levelLabel(to)}
        </span>
      </p>
    );
  }
  return (
    <p className="level-change">
      <Icon name="check" size={20} />
      <span>
        Tu restes au niveau <strong>{to}</strong>
        {to < meta.maxLevel ? ' : encore un effort pour monter.' : ', le plus élevé.'}
      </span>
    </p>
  );
}
