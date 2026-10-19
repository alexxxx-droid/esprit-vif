import { useEffect, useMemo, useState } from 'react';
import { generateMots, motsLevel, scoreMots } from '../../core/games/mots';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

interface Tally {
  hits: number;
  misses: number;
  falseAlarms: number;
  rejections: number;
}

export function MotsGame({ seed, level, onFinish }: GameProps) {
  const config = motsLevel(level);
  const studyMs = slow(config.studyMs);
  const round = useMemo(() => generateMots(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [studying, setStudying] = useState(true);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<Tally>({ hits: 0, misses: 0, falseAlarms: 0, rejections: 0 });
  const [mark, showMark] = useFeedback();
  const total = round.probes.length;
  const done = index >= total;
  const probe = round.probes[Math.min(index, total - 1)];

  const endStudy = () => {
    clock.stop();
    setStudying(false);
  };

  useEffect(() => {
    if (!studying) return;
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= studyMs) {
        window.clearInterval(id);
        clock.stop();
        setStudying(false);
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock, studying, studyMs]);

  const answer = (seen: boolean) => {
    if (studying || done) return;
    const ok = seen === probe.seen;
    const next: Tally = {
      hits: tally.hits + (seen && probe.seen ? 1 : 0),
      misses: tally.misses + (!seen && probe.seen ? 1 : 0),
      falseAlarms: tally.falseAlarms + (seen && !probe.seen ? 1 : 0),
      rejections: tally.rejections + (!seen && !probe.seen ? 1 : 0),
    };
    if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', probe.seen ? 'Il était dans la liste' : 'Il n’y était pas');
    }
    setTally(next);
    setIndex(index + 1);
    if (index + 1 >= total) {
      onFinish({
        score: scoreMots(next.hits, next.falseAlarms, level),
        stats: { ...next, count: config.count },
        headline: `${next.hits}/${config.count} retrouvés · ${next.falseAlarms} piège${next.falseAlarms > 1 ? 's' : ''}`,
        lines: [
          { label: 'Mots retrouvés', value: `${next.hits} / ${config.count}` },
          { label: 'Mots oubliés', value: String(next.misses) },
          { label: 'Pièges évités', value: `${next.rejections} / ${config.count}` },
        ],
      });
    }
  };

  useKeyDown((e) => {
    const key = e.key.toLowerCase();
    if (studying && key === 'enter') {
      e.preventDefault();
      endStudy();
    } else if (key === 'arrowleft' || key === 'n') answer(false);
    else if (key === 'arrowright' || key === 'v') answer(true);
  }, !done);

  if (studying) {
    return (
      <div className="game">
        <GameHud>
          <TimeLeft clock={clock} durationMs={studyMs} />
        </GameHud>
        <div className="game__stage mots">
          <p className="mots__ask">Retiens ces {config.count} mots</p>
          <ul className={`mots__list${config.count > 12 ? ' mots__list--dense' : ''}`}>
            {round.study.map((word, i) => (
              <li key={word} style={{ animationDelay: `${i * 30}ms` }}>
                {word}
              </li>
            ))}
          </ul>
        </div>
        <div className="game__controls">
          <TapButton className="big-answer mots__ready" onTap={() => endStudy()}>
            C’est retenu
            <Icon name="arrow" />
          </TapButton>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      <GameHud progress={index / total}>
        <span className="chip">
          {Math.min(index + 1, total)}/{total}
        </span>
      </GameHud>
      <div className="game__stage mots">
        <div key={index} className="mots__probe" aria-live="polite">
          {probe.word}
        </div>
        <p className="mots__ask">Était-il dans la liste&nbsp;?</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls yes-no">
        <TapButton className="big-answer big-answer--no" onTap={() => answer(false)} aria-keyshortcuts="ArrowLeft">
          <Icon name="close" />
          Pas vu
        </TapButton>
        <TapButton className="big-answer big-answer--yes" onTap={() => answer(true)} aria-keyshortcuts="ArrowRight">
          <Icon name="check" />
          Vu
        </TapButton>
      </div>
    </div>
  );
}
