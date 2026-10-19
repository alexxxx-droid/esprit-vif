import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { answerLength, formatCalc } from '../../core/games/calcul';
import { generatePluie, PLUIE_DURATION_MS, PLUIE_LIVES, pluieLevel, pluieTarget, scorePluie } from '../../core/games/pluie';
import { createRng } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
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
  const [pops, setPops] = useState<Pop[]>([]);
  const [typed, setTyped] = useState('');
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const lives = PLUIE_LIVES - missed.size;
  const active = drops.slice(0, spawned).filter((d) => !solved.has(d.id) && !missed.has(d.id));
  const laneWidth = 100 / config.lanes;

  const finish = useEffectEvent((solvedCount: number, missedCount: number) => {
    setOver(true);
    clock.stop();
    onFinish({
      score: scorePluie(solvedCount, level),
      stats: { solved: solvedCount, missed: missedCount },
      headline: `${solvedCount} gouttes résolues`,
      lines: [
        { label: 'Gouttes résolues', value: String(solvedCount) },
        { label: 'Gouttes perdues', value: String(missedCount) },
        { label: 'Objectif pour 100 pts', value: String(pluieTarget(level)) },
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
    const fallen = drops.slice(0, next).filter((d) => !solved.has(d.id) && !missed.has(d.id) && d.spawnAt + fallMs <= t);
    let missedSet = missed;
    if (fallen.length) {
      missedSet = new Set([...missed, ...fallen.map((d) => d.id)]);
      setMissed(missedSet);
      fx.bad();
      showMark('bad', 'Une goutte est tombée');
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
    const match = active.find((d) => d.question.answer === Number(entry));
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
      showMark('bad', 'Aucune goutte ne vaut ça');
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
          <span className="pluie__lives" aria-label={`${lives} vie${lives > 1 ? 's' : ''}`}>
            {Array.from({ length: PLUIE_LIVES }, (_, i) => (
              <span key={i} className={i < lives ? 'is-left' : undefined} aria-hidden="true" />
            ))}
          </span>
        </div>
        <div className="rain" aria-live="polite">
          {active.map((drop) => (
            <span
              key={drop.id}
              className="drop"
              style={{ left: `${drop.lane * laneWidth + laneWidth / 2}%`, '--fall': `${fallMs}ms` } as CSSProperties}
            >
              {formatCalc(drop.question)}
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
        <p className={`rain__entry${typed ? ' is-filled' : ''}`}>{typed || 'Tape un résultat'}</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <NumPad onDigit={press} onErase={erase} />
      </div>
    </div>
  );
}
