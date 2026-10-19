import type { CSSProperties, ReactNode } from 'react';
import { compareToHistory, type Comparison } from '../../core/compare';
import type { GameMeta } from '../../core/games/registry';
import { MAX_LEVEL, starsFor, UNLOCK_SCORE } from '../../core/levels';
import { cheer } from '../../core/outcome';
import { MEDAL_NAMES, medalRank } from '../../core/progression';
import type { PlayMode } from '../../core/types';
import { gameUnlocked } from '../../store/progress';
import { ScoreRing } from '../components/bits';
import { GameArt } from '../components/GameArt';
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
  const newThreeStars = starsFor(outcome.score) === 3 && (delta ? delta.starsBefore < 3 : false);
  const celebrate = Boolean(saved?.record === 'new' || levelUp || newMedal || newThreeStars);
  // Sans serveur, on se compare à soi-même : les parties précédentes de ce jeu, la plus récente d'abord.
  const comparison = saved
    ? compareToHistory(
        outcome.score,
        data.plays
          .filter((p) => p.gameId === meta.id && p.id !== saved.play.id)
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((p) => p.score),
      )
    : null;
  return (
    <div className="result screen-in">
      {celebrate && <Confetti />}
      <p className="result__game">
        <GameArt gameId={meta.id} size={30} />
        {meta.name} · niveau {level}
      </p>
      <ScoreRing score={outcome.score} />
      <Stars count={starsFor(outcome.score)} size={30} animateFrom={delta ? delta.starsBefore : 0} />
      <h1 className="result__cheer">{cheer(outcome.score)}</h1>
      {comparison && <CompareLine comparison={comparison} />}

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

function CompareLine({ comparison }: { comparison: Comparison }) {
  if (comparison.kind === 'first') return <p className="compare">Première partie : c’est ton point de départ.</p>;
  if (comparison.kind === 'level') return <p className="compare">Dans ta moyenne récente ({comparison.average}&nbsp;pts).</p>;
  const up = comparison.kind === 'above';
  return (
    <p className={`compare compare--${comparison.kind}`}>
      <Icon name={up ? 'up' : 'down'} size={16} strokeWidth={2.6} />
      <span>
        <strong>
          {up ? '+' : '−'}
          {Math.abs(comparison.diff)}&nbsp;pts
        </strong>{' '}
        {up ? 'au-dessus de ta moyenne récente' : 'sous ta moyenne : ça arrive, la prochaine sera la bonne'}
      </span>
    </p>
  );
}

const CONFETTI_COLORS = ['var(--d-calcul)', 'var(--d-memoire)', 'var(--d-attention)', 'var(--d-vitesse)', 'var(--d-langage)', 'var(--accent)'];

/** Une gerbe de confettis pour les grands moments (record, trois étoiles, médaille, nouveau rang). */
function Confetti() {
  return (
    <span className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => {
        // Répartition régulière (angle d'or) : jolie et identique d'une fois sur l'autre.
        const angle = (i * 137.5 * Math.PI) / 180;
        const reach = 90 + ((i * 53) % 110);
        const style = {
          '--x': `${Math.round(Math.cos(angle) * reach)}px`,
          '--y': `${Math.round(Math.sin(angle) * reach * 0.7 - 40)}px`,
          '--r': `${(i * 77) % 360}deg`,
          '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(i % 7) * 25}ms`,
        } as CSSProperties;
        return <span key={i} className={i % 3 === 0 ? 'confetti__bit confetti__bit--round' : 'confetti__bit'} style={style} />;
      })}
    </span>
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
