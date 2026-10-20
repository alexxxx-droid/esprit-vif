import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { generateMots, motsLevel, scoreMots } from '../../core/games/mots';
import { NBSP } from '../../core/format';
import { tr } from '../../core/lang';
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
  const wordMs = slow(config.wordMs);
  const answerMs = config.answerMs ? slow(config.answerMs) : 0;
  const serial = config.wordMs > 0;
  const round = useMemo(() => generateMots(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [studying, setStudying] = useState(true);
  const [index, setIndex] = useState(0);
  // Défilé un par un : le mot montré.
  const [shown, setShown] = useState(0);
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
    if (!studying || serial) return;
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
  }, [clock, studying, studyMs, serial]);

  // Un par un : chaque mot reste `wordMs`, puis le suivant ; après le dernier, les questions.
  useEffect(() => {
    if (!studying || !serial) return;
    const id = window.setTimeout(() => {
      if (shown + 1 < round.sequence.length) setShown(shown + 1);
      else setStudying(false);
    }, wordMs);
    return () => window.clearTimeout(id);
  }, [studying, serial, shown, wordMs, round.sequence.length]);

  const answer = (seen: boolean, late = false) => {
    if (studying || done) return;
    const ok = seen === probe.seen;
    const next: Tally = {
      hits: tally.hits + (seen && probe.seen ? 1 : 0),
      misses: tally.misses + (!seen && probe.seen ? 1 : 0),
      falseAlarms: tally.falseAlarms + (seen && !probe.seen ? 1 : 0),
      rejections: tally.rejections + (!seen && !probe.seen ? 1 : 0),
    };
    if (late) {
      // Trop tard : compté « pas vu » (une bonne abstention si le mot n'y était pas).
      if (probe.seen) {
        fx.bad();
        showMark('bad', tr('Trop tard\u00a0: il était dans la liste', 'Too late: it was in the list'));
      }
    } else if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark(
        'bad',
        probe.seen
          ? tr('Il était dans la liste', 'It was in the list')
          : probe.forget
            ? tr('Il était barré', 'It was crossed out')
            : tr('Il n’y était pas', 'It wasn’t there'),
      );
    }
    setTally(next);
    setIndex(index + 1);
    if (index + 1 >= total) {
      onFinish({
        score: scoreMots(next.hits, next.falseAlarms, level),
        stats: { ...next, count: config.count },
        headline: tr(
          `${next.hits}/${config.count} retrouvés · ${next.falseAlarms} piège${next.falseAlarms > 1 ? 's' : ''}`,
          `${next.hits}/${config.count} recalled · ${next.falseAlarms} trap${next.falseAlarms === 1 ? '' : 's'}`,
        ),
        lines: [
          { label: tr('Mots retrouvés', 'Words recalled'), value: `${next.hits} / ${config.count}` },
          { label: tr('Mots oubliés', 'Words forgotten'), value: String(next.misses) },
          { label: tr('Pièges évités', 'Traps avoided'), value: `${next.rejections} / ${config.count}` },
        ],
      });
    }
  };

  // Légende : chaque mot a son temps de réponse ; sans réponse, c'est « pas vu ».
  const timeUp = useEffectEvent(() => answer(false, true));
  useEffect(() => {
    if (studying || done || !answerMs) return;
    const id = window.setTimeout(() => timeUp(), answerMs);
    return () => window.clearTimeout(id);
  }, [studying, done, index, answerMs]);

  useKeyDown((e) => {
    const key = e.key.toLowerCase();
    if (studying && serial) return;
    if (studying && key === 'enter') {
      e.preventDefault();
      endStudy();
    } else if (key === 'arrowleft' || key === 'n') answer(false);
    else if (key === 'arrowright' || key === tr('v', 'y')) answer(true);
  }, !done);

  if (studying && serial) {
    const item = round.sequence[shown];
    return (
      <div className="game">
        <GameHud progress={shown / round.sequence.length}>
          <span className="chip">
            {shown + 1}/{round.sequence.length}
          </span>
        </GameHud>
        <div className="game__stage mots">
          <p className="mots__ask">
            {config.decoys
              ? tr('Retiens les mots, pas ceux qui sont barrés', 'Memorize the words, not the crossed-out ones')
              : tr(`Retiens ces ${config.count} mots`, `Memorize these ${config.count} words`)}
          </p>
          <div key={shown} className={`mots__probe mots__flash${item.forget ? ' is-forget' : ''}`} aria-live="polite">
            {item.word}
          </div>
          <p className="mots__tag" aria-hidden={!item.forget}>
            {item.forget ? tr('À oublier', 'Forget it') : '\u00a0'}
          </p>
        </div>
      </div>
    );
  }

  if (studying) {
    return (
      <div className="game">
        <GameHud>
          <TimeLeft clock={clock} durationMs={studyMs} />
        </GameHud>
        <div className="game__stage mots">
          <p className="mots__ask">{tr(`Retiens ces ${config.count} mots`, `Memorize these ${config.count} words`)}</p>
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
            {tr('C’est retenu', 'Got it')}
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
        {answerMs > 0 && (
          <span className="qui__timer" aria-hidden="true">
            <span key={index} style={{ animationDuration: `${answerMs}ms` }} />
          </span>
        )}
        <p className="mots__ask">{tr(`Était-il dans la liste${NBSP}?`, 'Was it in the list?')}</p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls yes-no">
        <TapButton className="big-answer big-answer--no" onTap={() => answer(false)} aria-keyshortcuts="ArrowLeft">
          <Icon name="close" />
          {tr('Pas vu', 'Not seen')}
        </TapButton>
        <TapButton className="big-answer big-answer--yes" onTap={() => answer(true)} aria-keyshortcuts="ArrowRight">
          <Icon name="check" />
          {tr('Vu', 'Seen')}
        </TapButton>
      </div>
    </div>
  );
}
