import type { ReactNode } from 'react';
import type { GameMeta } from '../../core/games/registry';
import { MAX_LEVEL, starsFor, UNLOCK_SCORE } from '../../core/levels';
import { cheer } from '../../core/outcome';
import { MEDAL_NAMES, medalRank } from '../../core/progression';
import type { PlayMode } from '../../core/types';
import { gameUnlocked } from '../../store/progress';
import { ScoreRing } from '../components/bits';
import { Icon } from '../components/Icon';
import { MedalBadge, RankBar, Stars } from '../components/progress-bits';
import { useProgress } from '../progress-context';
import { TROPHY_ICONS } from '../trophy-icons';
import type { RunResult } from './GameRunner';

interface GameResultProps {
  meta: GameMeta;
  mode: PlayMode;
  result: RunResult;
  children: ReactNode;
}

export function GameResult({ meta, mode, result, children }: GameResultProps) {
  const data = useProgress();
  const { outcome, saved, level, delta } = result;
  const levelUp = delta && delta.rankAfter.level > delta.rankBefore.level;
  const newMedal = delta && delta.medalAfter && medalRank(delta.medalAfter) > medalRank(delta.medalBefore);
  return (
    <div className="result screen-in">
      <p className="result__game">
        {meta.name} · niveau {level}
      </p>
      <ScoreRing score={outcome.score} />
      <Stars count={starsFor(outcome.score)} size={30} animateFrom={delta ? delta.starsBefore : 0} />
      <h1 className="result__cheer">{cheer(outcome.score)}</h1>

      {saved?.record === 'new' && (
        <p className="badge badge--record">
          <Icon name="star" size={18} />
          Nouveau record&nbsp;! <span className="badge__aside">avant&nbsp;: {saved.previousBest?.score} pts</span>
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

      {mode === 'free' && delta && (
        <UnlockLine
          level={level}
          score={outcome.score}
          unlockedNext={delta.unlockedNext}
          alreadyOpen={gameUnlocked(data, meta.id) > level && !delta.unlockedNext}
        />
      )}

      {delta && (
        <section className="gains" aria-label="Ce que tu as gagné">
          {levelUp && (
            <p className="gain gain--level">
              <Icon name="crown" size={22} />
              <span>
                Niveau {delta.rankAfter.level}&nbsp;! <strong>{delta.rankAfter.title}</strong>
              </span>
            </p>
          )}
          {newMedal && delta.medalAfter && (
            <p className="gain gain--medal">
              <MedalBadge medal={delta.medalAfter} size={30} />
              <span>
                Médaille <strong>{MEDAL_NAMES[delta.medalAfter]}</strong> en {meta.name}&nbsp;!
              </span>
            </p>
          )}
          {delta.newTrophies.map((trophy) => (
            <p key={trophy.id} className="gain gain--trophy">
              <span className="gain__icon">
                <Icon name={TROPHY_ICONS[trophy.icon]} size={20} />
              </span>
              <span>
                Trophée <strong>{trophy.name}</strong>
                <span className="gain__desc">{trophy.description}</span>
              </span>
            </p>
          ))}
          <div className="xp-card">
            <p className="xp-card__gain">+{delta.xpGained}&nbsp;XP</p>
            <RankBar rank={delta.rankAfter} compact />
          </div>
        </section>
      )}

      <div className="result__actions">{children}</div>
    </div>
  );
}

interface UnlockLineProps {
  level: number;
  score: number;
  unlockedNext: boolean;
  /** Le niveau suivant était déjà ouvert avant cette partie. */
  alreadyOpen: boolean;
}

function UnlockLine({ level, score, unlockedNext, alreadyOpen }: UnlockLineProps) {
  if (unlockedNext) {
    return (
      <p className="level-change level-change--up">
        <Icon name="up" size={20} />
        <span>
          Niveau <strong>{level + 1}</strong> débloqué&nbsp;!
        </span>
      </p>
    );
  }
  if (alreadyOpen || level >= MAX_LEVEL || score >= UNLOCK_SCORE) return null;
  return (
    <p className="level-change">
      <Icon name="lock" size={20} />
      <span>
        Encore <strong>{UNLOCK_SCORE - score}&nbsp;pts</strong> pour gagner une étoile et débloquer le niveau suivant.
      </span>
    </p>
  );
}
