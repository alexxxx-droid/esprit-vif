import type { GameMeta } from '../../core/games/registry';
import { MAX_LEVEL } from '../../core/levels';
import { bestFor } from '../../store/progress';
import { DomainChip } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { LevelPicker } from '../components/progress-bits';
import { GAME_DEMOS, NUMBER_GAMES } from '../games/catalog';
import { useProgress, useStore } from '../progress-context';

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
  const store = useStore();
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
        <div className="intro__hero">
          <GameArt gameId={meta.id} size={76} className="intro__art" />
          <DomainChip domain={meta.domain} />
        </div>
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

      {NUMBER_GAMES.has(meta.id) && (
        <div className="answer-mode">
          <span className="answer-mode__label" id="answer-mode">
            Répondre avec
          </span>
          <div className="segmented segmented--tight answer-mode__options" role="radiogroup" aria-labelledby="answer-mode">
            {([false, true] as const).map((handwriting) => (
              <button
                key={String(handwriting)}
                type="button"
                role="radio"
                aria-checked={data.settings.handwriting === handwriting}
                className="segmented__option"
                onClick={() => void store.updateSettings({ handwriting })}
              >
                <Icon name={handwriting ? 'pen' : 'keypad'} size={18} />
                {handwriting ? 'Le doigt' : 'Le pavé'}
              </button>
            ))}
          </div>
        </div>
      )}

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
