import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { compareToHistory, type Comparison } from '../../core/compare';
import type { GameMeta } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { ALL_TIERS, isMastery, masteryName, passScore, starsFor, tierName, tierOf, TOP_LEVEL } from '../../core/levels';
import { objectiveLabel } from '../../core/objectives';
import { cheer } from '../../core/outcome';
import { MEDAL_NAMES, medalRank } from '../../core/progression';
import type { PlayMode } from '../../core/types';
import { gameUnlocked } from '../../store/progress';
import { ScoreRing } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { fx } from '../fx/fx';
import { Mascot } from '../components/Mascot';
import { ShareButton } from '../components/ShareButton';
import { formatLongDay } from '../../core/format';
import { dayKey } from '../../core/daily';
import { renderCard } from '../share-card';
import { moodForScore } from '../mascot-mood';
import { Icon } from '../components/Icon';
import { MedalBadge, RankBar, Stars } from '../components/progress-bits';
import { useProgress } from '../progress-context';
import { rich } from '../rich';
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
  const mastery = isMastery(level);
  // Un cran de maîtrise réussi pour la première fois : un grand moment, lui aussi.
  const masteryPassed = mastery && outcome.score >= passScore(level) && (saved?.previousBest?.score ?? -1) < passScore(level);
  const celebrate = Boolean(saved?.record === 'new' || levelUp || newMedal || (!mastery && newThreeStars) || masteryPassed);
  const starsNow = starsFor(outcome.score);
  const starsBefore = delta ? delta.starsBefore : 0;

  // Un tintement par étoile nouvellement gagnée, au rythme de leur apparition.
  useEffect(() => {
    const timers = Array.from({ length: Math.max(0, starsNow - starsBefore) }, (_, k) =>
      window.setTimeout(() => fx.star(starsBefore + k), 300 + k * 180),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [starsNow, starsBefore]);
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
        {meta.name} · {tr('niveau', 'level')} {level}
      </p>
      <div className="result__ring">
        <ScoreRing score={outcome.score} />
        <ResultVif score={outcome.score} celebrate={celebrate} />
      </div>
      {mastery ? (
        <p className={`mastery-line${outcome.score >= passScore(level) ? ' is-passed' : ''}`}>
          <Icon name="crown" size={20} />
          {outcome.score >= passScore(level)
            ? tr(`${masteryName(level)} réussie !`, `${masteryName(level)} passed!`)
            : tr(`${masteryName(level)} : il fallait ${passScore(level)} pts`, `${masteryName(level)}: ${passScore(level)} pts needed`)}
        </p>
      ) : (
        <Stars count={starsFor(outcome.score)} size={30} animateFrom={delta ? delta.starsBefore : 0} />
      )}
      <h1 className="result__cheer">{cheer(outcome.score)}</h1>
      {comparison && <CompareLine comparison={comparison} />}

      {saved?.record === 'new' && (
        <p className="badge badge--record">
          <Icon name="star" size={18} />
          {tr('Nouveau record\u00a0!', 'New best!')}{' '}
          <span className="badge__aside">{tr(`avant\u00a0: ${saved.previousBest?.score} pts`, `before: ${saved.previousBest?.score} pts`)}</span>
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
        <section className="gains" aria-label={tr('Ce que tu as gagné', 'What you earned')}>
          {levelUp && (
            <p className="gain gain--level">
              <Icon name="crown" size={22} />
              <span>
                {tr(`Niveau ${delta.rankAfter.level}\u00a0!`, `Level ${delta.rankAfter.level}!`)}{' '}
                <strong>{delta.rankAfter.title}</strong>
              </span>
            </p>
          )}
          {newMedal && delta.medalAfter && (
            <p className="gain gain--medal">
              <MedalBadge medal={delta.medalAfter} size={30} />
              <span>
                {rich(tr('Médaille {medal} en {game}\u00a0!', '{medal} medal in {game}!'), {
                  medal: <strong>{MEDAL_NAMES[delta.medalAfter]}</strong>,
                  game: meta.name,
                })}
              </span>
            </p>
          )}
          {delta.newTrophies.map((trophy) => (
            <p key={trophy.id} className="gain gain--trophy">
              <span className="gain__icon">
                <Icon name={TROPHY_ICONS[trophy.icon]} size={20} />
              </span>
              <span>
                {tr('Trophée', 'Trophy')} <strong>{trophy.name}</strong>
                <span className="gain__desc">{trophy.description}</span>
              </span>
            </p>
          ))}
          {delta.objectivesCompleted.map((objective) => (
            <p key={objective.id} className="gain gain--objective">
              <span className="gain__icon">
                <Icon name="check" size={20} strokeWidth={3} />
              </span>
              <span>
                {tr('Objectif du jour rempli', 'Daily goal complete')}
                <span className="gain__desc">{objectiveLabel(objective)}</span>
              </span>
            </p>
          ))}
          <div className="xp-card">
            <p className="xp-card__gain">
              +{delta.xpGained}&nbsp;XP
              {delta.sparksGained > 0 && (
                <span className="xp-card__sparks" aria-label={tr(`${delta.sparksGained} étincelles`, `${delta.sparksGained} sparks`)}>
                  <Icon name="spark" size={14} />+{delta.sparksGained}
                </span>
              )}
            </p>
            <RankBar rank={delta.rankAfter} compact />
          </div>
        </section>
      )}

      <ShareButton
        label={tr('Partager mon score', 'Share my score')}
        build={async () => {
          const color = getComputedStyle(document.documentElement).getPropertyValue(`--d-${meta.domain}`).trim();
          const line =
            comparison?.kind === 'first'
              ? tr('Ma première partie !', 'My first game!')
              : comparison?.kind === 'above'
                ? tr(`+${comparison.diff} pts au-dessus de ma moyenne`, `+${comparison.diff} pts above my average`)
                : comparison?.kind === 'level'
                  ? tr('Dans ma moyenne', 'Right on my average')
                  : undefined;
          const image = await renderCard(
            {
              kind: 'result',
              game: meta.name,
              level,
              score: outcome.score,
              stars: starsFor(outcome.score),
              color,
              line,
              mascot: document.querySelector<SVGSVGElement>('.result__vif'),
            },
            formatLongDay(dayKey()),
          );
          return {
            image,
            name: `esprit-vif-${meta.id}-${outcome.score}.png`,
            text: tr(
              `J’ai fait ${outcome.score}/100 à ${meta.name} (niveau ${level}) sur Esprit Vif. À ton tour ! https://alexxxx-droid.github.io/esprit-vif/`,
              `I scored ${outcome.score}/100 in ${meta.name} (level ${level}) on Esprit Vif. Your turn! https://alexxxx-droid.github.io/esprit-vif/`,
            ),
          };
        }}
      />

      <div className="result__actions">{children}</div>
    </div>
  );
}

/**
 * Vif bondit à côté du score et y réagit : un grand moment (record, trois étoiles, médaille, rang)
 * le laisse d'abord bouche bée, puis il saute de joie ; sinon, il prend l'humeur du score.
 */
function ResultVif({ score, celebrate }: { score: number; celebrate: boolean }) {
  const [amazed, setAmazed] = useState(celebrate);
  useEffect(() => {
    if (!amazed) return;
    const timer = window.setTimeout(() => setAmazed(false), 1300);
    return () => window.clearTimeout(timer);
  }, [amazed]);
  const mood = celebrate ? (amazed ? 'wow' : 'cheer') : moodForScore(score);
  return <Mascot mood={mood} size={70} className={`result__vif${celebrate ? ' result__vif--big' : ''}`} />;
}

function CompareLine({ comparison }: { comparison: Comparison }) {
  if (comparison.kind === 'first')
    return <p className="compare">{tr('Première partie : c’est ton point de départ.', 'First game: this is your starting point.')}</p>;
  if (comparison.kind === 'level')
    return (
      <p className="compare">
        {tr(`Dans ta moyenne récente (${comparison.average}\u00a0pts).`, `Right on your recent average (${comparison.average}\u00a0pts).`)}
      </p>
    );
  const up = comparison.kind === 'above';
  return (
    <p className={`compare compare--${comparison.kind}`}>
      <Icon name={up ? 'up' : 'down'} size={16} strokeWidth={2.6} />
      <span>
        <strong>
          {up ? '+' : '−'}
          {Math.abs(comparison.diff)}&nbsp;pts
        </strong>{' '}
        {up
          ? tr('au-dessus de ta moyenne récente', 'above your recent average')
          : tr('sous ta moyenne : ça arrive, la prochaine sera la bonne', 'below your average: it happens, the next one will be better')}
      </span>
    </p>
  );
}

const CONFETTI_COLORS = [
  'var(--d-calcul)',
  'var(--d-memoire)',
  'var(--d-attention)',
  'var(--d-vitesse)',
  'var(--d-langage)',
  'var(--accent)',
];

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
          {isMastery(level + 1)
            ? rich(tr('{level} ouverte\u00a0!', '{level} unlocked!'), { level: <strong>{masteryName(level + 1)}</strong> })
            : rich(tr('Niveau {level} débloqué\u00a0!', 'Level {level} unlocked!'), { level: <strong>{level + 1}</strong> })}
          {ALL_TIERS.some((t) => t.from === level + 1) && (
            <span className="level-change__tier">
              {tr('Nouveau palier\u00a0: ', 'New tier: ')}
              <strong>{tierName(tierOf(level + 1))}</strong>
            </span>
          )}
        </span>
      </p>
    );
  }
  if (alreadyOpen || level >= TOP_LEVEL || score >= passScore(level)) return null;
  if (isMastery(level)) {
    return (
      <p className="level-change">
        <Icon name="lock" size={20} />
        <span>
          {rich(tr('Encore {points} pour réussir {level} et ouvrir le cran suivant.', '{points} to pass {level} and open the next step.'), {
            points: <strong>{tr(`${passScore(level) - score}\u00a0pts`, `${passScore(level) - score}\u00a0more pts`)}</strong>,
            level: masteryName(level),
          })}
        </span>
      </p>
    );
  }
  return (
    <p className="level-change">
      <Icon name="lock" size={20} />
      <span>
        {rich(tr('Encore {points} pour gagner une étoile et débloquer le niveau suivant.', '{points} to earn a star and unlock the next level.'), {
          points: <strong>{tr(`${passScore(level) - score}\u00a0pts`, `${passScore(level) - score}\u00a0more pts`)}</strong>,
        })}
      </span>
    </p>
  );
}
