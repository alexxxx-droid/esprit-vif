import type { GameMeta } from '../../core/games/registry';
import { MAX_LEVEL } from '../../core/levels';
import { bestFor } from '../../store/progress';
import { DomainChip } from '../components/bits';
import { Icon } from '../components/Icon';
import { LevelPicker } from '../components/progress-bits';
import { GAME_DEMOS } from '../games/catalog';
import { useProgress } from '../progress-context';

interface GameIntroProps {
  meta: GameMeta;
  level: number;
  /** Présent quand le joueur peut choisir son niveau. */
  onLevelChange?: (level: number) => void;
  badge?: string;
  notice: string | null;
  startLabel?: string;
  onStart: () => void;
  onQuit: () => void;
}

export function GameIntro({ meta, level, onLevelChange, badge, notice, startLabel, onStart, onQuit }: GameIntroProps) {
  const data = useProgress();
  const best = bestFor(data, meta.id, level);
  const Demo = GAME_DEMOS[meta.id];
  return (
    <div className="intro screen-in">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={onQuit} aria-label="Retour">
          <Icon name="back" />
        </button>
        {badge && <span className="pill">{badge}</span>}
      </header>

      <div className="intro__head">
        <DomainChip domain={meta.domain} />
        <h1 className="intro__title">{meta.name}</h1>
        <p className="intro__rule">{meta.rule(level)}</p>
      </div>

      <div className="intro__demo" aria-hidden="true">
        <Demo level={level} />
      </div>

      {onLevelChange && <LevelPicker gameId={meta.id} selected={level} onSelect={onLevelChange} />}

      <dl className="facts">
        <div className="facts__wide">
          <dt>
            Niveau {level}/{MAX_LEVEL}
          </dt>
          <dd>{meta.levelLabel(level)}</dd>
        </div>
        <div>
          <dt>Record</dt>
          <dd>{best ? `${best.score} pts` : '—'}</dd>
        </div>
      </dl>

      {notice && (
        <p className="notice" role="status">
          <Icon name="info" size={20} />
          {notice}
        </p>
      )}

      <button type="button" className="cta intro__start" onClick={onStart} autoFocus>
        <span className="cta__text">
          <span className="cta__label">{startLabel ?? 'C’est parti'}</span>
          <span className="cta__sub">{meta.duration}</span>
        </span>
        <span className="cta__icon">
          <Icon name="play" />
        </span>
      </button>
    </div>
  );
}
