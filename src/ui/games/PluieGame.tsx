import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import { tr } from '../../core/lang';
import { answerLength, formatCalc } from '../../core/games/calcul';
import { generatePluie, PLUIE_DURATION_MS, PLUIE_LIVES, pluieLevel, pluieTarget, scorePluie } from '../../core/games/pluie';
import { createRng } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

interface Pop {
  id: number;
  lane: number;
  top: number;
}

export function PluieGame({ seed, level, onFinish }: GameProps) {
  const config = pluieLevel(level);
  const fallMs = slow(config.fallMs);
  const drops = useMemo(() => generatePluie(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [spawned, setSpawned] = useState(0);
  const [solved, setSolved] = useState<ReadonlySet<number>>(new Set());
  const [missed, setMissed] = useState<ReadonlySet<number>>(new Set());
  /** Gouttes piégées tombées à l'eau sans dommage. */
  const [gone, setGone] = useState<ReadonlySet<number>>(new Set());
  const [pops, setPops] = useState<Pop[]>([]);
  const [typed, setTyped] = useState('');
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const lives = PLUIE_LIVES - missed.size;
  const active = drops.slice(0, spawned).filter((d) => !solved.has(d.id) && !missed.has(d.id) && !gone.has(d.id));
  // Brouillard : le calcul s'efface après cette part de la chute.
  const fogMs = config.fog ? Math.round(fallMs * config.fog) : 0;
  const laneWidth = 100 / config.lanes;

  const finish = useEffectEvent((solvedCount: number, missedCount: number) => {
    setOver(true);
    clock.stop();
    onFinish({
      score: scorePluie(solvedCount, level),
      stats: { solved: solvedCount, missed: missedCount },
      headline: tr(`${solvedCount} gouttes résolues`, `${plural(solvedCount, 'drop')} solved`),
      lines: [
        { label: tr('Gouttes résolues', 'Drops solved'), value: String(solvedCount) },
        { label: tr('Gouttes perdues', 'Drops lost'), value: String(missedCount) },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(pluieTarget(level)) },
      ],
    });
  });

  // Horloge du jeu : apparition des gouttes, gouttes tombées à l'eau, fin de partie.
  const tick = useEffectEvent(() => {
    if (over) return;
    const t = clock.elapsed();
    let next = spawned;
    while (next < drops.length && drops[next].spawnAt <= t) next++;
    if (next !== spawned) setSpawned(next);
    const reached = drops.slice(0, next).filter((d) => !solved.has(d.id) && !missed.has(d.id) && !gone.has(d.id) && d.spawnAt + fallMs <= t);
    // Une goutte piégée qui touche l'eau ne coûte rien : c'était le bon choix.
    const harmless = reached.filter((d) => d.trap);
    if (harmless.length) setGone(new Set([...gone, ...harmless.map((d) => d.id)]));
    const fallen = reached.filter((d) => !d.trap);
    let missedSet = missed;
    if (fallen.length) {
      missedSet = new Set([...missed, ...fallen.map((d) => d.id)]);
      setMissed(missedSet);
      fx.bad();
      showMark('bad', tr('Une goutte est tombée', 'A drop fell'));
    }
    if (missedSet.size >= PLUIE_LIVES || t >= PLUIE_DURATION_MS) finish(solved.size, missedSet.size);
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => tick(), 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock]);

  const press = (digit: string) => {
    if (over) return;
    const entry = typed + digit;
    const matches = active.filter((d) => d.question.answer === Number(entry));
    // Une vraie goutte passe avant un piège de même résultat.
    const match = matches.find((d) => !d.trap) ?? matches[0];
    if (match?.trap) {
      // Répondre à une goutte piégée coûte une vie (la fin de partie se constate au prochain battement d'horloge).
      fx.bad();
      setMissed(new Set([...missed, match.id]));
      setTyped('');
      showMark('bad', tr('Piège ! Celle-là, il fallait la laisser tomber', 'Trap! You had to let that one fall'));
      return;
    }
    if (match) {
      fx.good();
      setSolved(new Set([...solved, match.id]));
      const top = Math.min(100, ((clock.elapsed() - match.spawnAt) / fallMs) * 100);
      setPops([...pops.slice(-4), { id: match.id, lane: match.lane, top }]);
      setTyped('');
      return;
    }
    const longest = Math.max(1, ...active.map((d) => answerLength(d.question.answer)));
    if (entry.length >= longest) {
      fx.bad();
      setTyped('');
      showMark('bad', tr('Aucune goutte ne vaut ça', 'No drop equals that'));
      return;
    }
    fx.tap();
    setTyped(entry);
  };

  const erase = () => setTyped(typed.slice(0, -1));

  useKeyDown((e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={PLUIE_DURATION_MS} />
      </GameHud>
      <div className="game__stage pluie">
        <div className="pluie__status">
          <span className="pluie__score">
            <strong>{solved.size}</strong> / {pluieTarget(level)}
          </span>
          <span className="pluie__lives" aria-label={tr(`${lives} vie${lives > 1 ? 's' : ''}`, `${lives} ${lives === 1 ? 'life' : 'lives'}`)}>
            {Array.from({ length: PLUIE_LIVES }, (_, i) => (
              <span key={i} className={i < lives ? 'is-left' : undefined} aria-hidden="true" />
            ))}
          </span>
        </div>
        <div className="rain" aria-live="polite">
          {active.map((drop) => (
            <span
              key={drop.id}
              className={`drop${drop.trap ? ' drop--trap' : ''}${fogMs ? ' drop--fog' : ''}`}
              style={{ left: `${drop.lane * laneWidth + laneWidth / 2}%`, '--fall': `${fallMs}ms`, '--fog': `${fogMs}ms` } as CSSProperties}
            >
              {drop.trap && <Icon name="vitesse" size={14} />}
              <span className="drop__text">{formatCalc(drop.question)}</span>
              {drop.trap && <span className="sr-only">{tr(' (piège)', ' (trap)')}</span>}
            </span>
          ))}
          {pops.map((pop) => (
            <span
              key={pop.id}
              className="drop-pop"
              style={{ left: `${pop.lane * laneWidth + laneWidth / 2}%`, top: `${pop.top * 0.86}%` }}
              aria-hidden="true"
            />
          ))}
          <div className="rain__water" aria-hidden="true" />
        </div>
        <p className={`rain__entry${typed ? ' is-filled' : ''}`}>{typed || tr('Tape un résultat', 'Type an answer')}</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} />
      </div>
    </div>
  );
}
