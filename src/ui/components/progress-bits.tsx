import { Fragment, useEffect, useRef } from 'react';
import { lang, tr } from '../../core/lang';
import { MAX_LEVEL, starsFor, tierName, TIERS } from '../../core/levels';
import { MEDAL_NAMES, type Medal, type Rank } from '../../core/progression';
import type { GameId } from '../../core/types';
import { gameUnlocked } from '../../store/progress';
import { useProgress } from '../progress-context';
import { Icon } from './Icon';

/** « 2 étoiles » / « 2 stars » (en français, 0 et 1 au singulier). */
function starsText(count: number): string {
  return tr(`${count} étoile${count > 1 ? 's' : ''}`, `${count} star${count === 1 ? '' : 's'}`);
}

/** 0 à 3 étoiles : pleines ou en creux (la forme porte l'info, pas seulement la couleur). */
export function Stars({ count, size = 16, animateFrom }: { count: number; size?: number; animateFrom?: number }) {
  return (
    <span className="stars" role="img" aria-label={tr(`${starsText(count)} sur 3`, `${starsText(count)} out of 3`)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`stars__star${i < count ? ' is-on' : ''}${animateFrom !== undefined && i >= animateFrom && i < count ? ' is-new' : ''}`}
          style={animateFrom !== undefined ? { animationDelay: `${300 + (i - animateFrom) * 180}ms` } : undefined}
        >
          <Icon name={i < count ? 'star' : 'star-line'} size={size} strokeWidth={1.8} />
        </span>
      ))}
    </span>
  );
}

/** « Médaille Or » / « Gold medal ». */
function medalTitle(medal: Medal): string {
  return lang() === 'en' ? `${MEDAL_NAMES[medal]} medal` : `Médaille ${MEDAL_NAMES[medal]}`;
}

export function MedalBadge({ medal, size = 28, withName = false }: { medal: Medal; size?: number; withName?: boolean }) {
  return (
    <span className={`medal medal--${medal}`} title={medalTitle(medal)}>
      <span className="medal__disc" style={{ width: size, height: size }}>
        <Icon name="medal" size={Math.round(size * 0.62)} />
      </span>
      {withName ? <span className="medal__name">{MEDAL_NAMES[medal]}</span> : <span className="sr-only">{medalTitle(medal)}</span>}
    </span>
  );
}

/** Les 20 niveaux d'un jeu : étoiles gagnées, niveaux verrouillés, niveau choisi. */
export function LevelPicker({ gameId, selected, onSelect }: { gameId: GameId; selected: number; onSelect: (level: number) => void }) {
  const data = useProgress();
  const bests = data.games[gameId]?.bests ?? {};
  const unlocked = gameUnlocked(data, gameId);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chip = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (chip && row.current) row.current.scrollLeft = chip.offsetLeft - row.current.clientWidth / 2 + chip.clientWidth / 2;
  }, [selected]);

  return (
    <div className="levels" ref={row} role="group" aria-label={tr('Choix du niveau', 'Choose a level')}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => {
        const level = i + 1;
        const locked = level > unlocked;
        const stars = starsFor(bests[level]?.score ?? 0);
        const tier = TIERS.find((t) => t.from === level);
        return (
          <Fragment key={level}>
            {/* Un intitulé au début de chaque palier : Débutant, Confirmé, Expert… */}
            {tier && <span className={`levels__tier tier-pill--${tier.id}`}>{tierName(tier.id)}</span>}
            <button
              type="button"
              className="level-chip"
              aria-pressed={level === selected}
              disabled={locked}
              onClick={() => onSelect(level)}
              aria-label={
                locked
                  ? tr(`Niveau ${level}, verrouillé`, `Level ${level}, locked`)
                  : tr(`Niveau ${level}, ${starsText(stars)}`, `Level ${level}, ${starsText(stars)}`)
              }
            >
              <span className="level-chip__num">{locked ? <Icon name="lock" size={16} /> : level}</span>
              <Stars count={locked ? 0 : stars} size={10} />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Niveau de joueur, titre et barre d'XP vers le niveau suivant. */
export function RankBar({ rank, compact = false }: { rank: Rank; compact?: boolean }) {
  const span = rank.nextAt - rank.levelStart;
  const progress = Math.min(1, Math.max(0, (rank.xp - rank.levelStart) / span));
  return (
    <div className={`rank${compact ? ' rank--compact' : ''}`}>
      <span className="rank__level" aria-hidden="true">
        {rank.level}
      </span>
      <div className="rank__body">
        <p className="rank__title">
          <span className="sr-only">{tr(`Niveau ${rank.level} : `, `Level ${rank.level}: `)}</span>
          {rank.title}
        </p>
        <div
          className="rank__bar"
          role="progressbar"
          aria-label={tr('XP vers le niveau suivant', 'XP to the next level')}
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={rank.xp - rank.levelStart}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="rank__xp">
          {tr(
            `${rank.xp - rank.levelStart} / ${span} XP · niveau ${rank.level + 1} ensuite`,
            `${rank.xp - rank.levelStart} / ${span} XP · level ${rank.level + 1} next`,
          )}
        </p>
      </div>
    </div>
  );
}
