import { durationFor, type GameMeta } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { isMastery, MASTERY_LEVELS, MAX_LEVEL, masteryRank, playedLevel, tierName, tierOf } from '../../core/levels';
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
  /** Présent quand le jeu a un essai guidé. */
  onTutorial?: () => void;
  onQuit: () => void;
}

export function GameIntro({ meta, level, onLevelChange, badge, notice, startLabel, onStart, onTutorial, onQuit }: GameIntroProps) {
  const data = useProgress();
  const store = useStore();
  const best = bestFor(data, meta.id, level);
  const Demo = GAME_DEMOS[meta.id];
  const firstTime = !data.plays.some((p) => p.gameId === meta.id);
  return (
    <div className="intro screen-in">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={onQuit} aria-label={tr('Retour', 'Back')}>
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
        <p className="intro__rule">{meta.rule(playedLevel(level))}</p>
      </div>

      <div className="intro__demo" aria-hidden="true">
        <Demo level={playedLevel(level)} />
      </div>

      {onLevelChange && <LevelPicker gameId={meta.id} selected={level} onSelect={onLevelChange} />}

      <dl className="facts">
        <div className="facts__wide">
          <dt>
            {isMastery(level) ? tr(`Cran ${masteryRank(level)}/${MASTERY_LEVELS}`, `Step ${masteryRank(level)}/${MASTERY_LEVELS}`) : `${tr('Niveau', 'Level')} ${level}/${MAX_LEVEL}`}
            <span className={`tier-pill tier-pill--${tierOf(level)}`}>{tierName(tierOf(level))}</span>
          </dt>
          <dd>{meta.levelLabel(level)}</dd>
        </div>
        <div>
          <dt>{tr('Record', 'Best score')}</dt>
          <dd>{best ? `${best.score} pts` : '—'}</dd>
        </div>
      </dl>

      {NUMBER_GAMES.has(meta.id) && (
        <div className="answer-mode">
          <span className="answer-mode__label" id="answer-mode">
            {tr('Répondre avec', 'Answer with')}
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
                {handwriting ? tr('Le doigt', 'Finger') : tr('Le pavé', 'Keypad')}
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

      {onTutorial && firstTime && (
        <p className="notice notice--warm">
          <Icon name="info" size={20} />
          {tr(
            'Première fois\u00a0? L’essai guidé t’explique le jeu en une minute, sans chrono.',
            'First time? The guided practice explains the game in a minute, with no timer.',
          )}
        </p>
      )}

      <button type="button" className="cta intro__start" onClick={onStart} autoFocus>
        <span className="cta__text">
          <span className="cta__label">{startLabel ?? tr('C’est parti', 'Let’s go')}</span>
          <span className="cta__sub">{durationFor(meta, level)}</span>
        </span>
        <span className="cta__icon">
          <Icon name="play" />
        </span>
      </button>
      {onTutorial && (
        <button type="button" className="btn btn--lg btn--ghost intro__tutorial" onClick={onTutorial}>
          <Icon name="training" />
          {tr('Essai guidé, sans chrono', 'Guided practice, no timer')}
        </button>
      )}
    </div>
  );
}
