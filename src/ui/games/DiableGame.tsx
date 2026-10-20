import { useEffect, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { formatSeconds } from '../../core/format';
import { answerLength, formatCalc, formatSolved } from '../../core/games/calcul';
import { diableLevel, generateDiable, generateDiableBacks, scoreDiable } from '../../core/games/diable';
import { createRng, deriveSeed } from '../../core/rng';
import { NumPad } from '../components/bits';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, Stopwatch } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';
import { useFitWidth } from './fit-text';

export function DiableGame({ seed, level, onFinish }: GameProps) {
  const { n, count, hideMs, varying } = diableLevel(level);
  const questions = useMemo(() => generateDiable(createRng(seed), level), [seed, level]);
  // L'écart de chaque réponse : toujours n, sauf aux niveaux à écart variable (tiré à part, la partie reste la même).
  const backs = useMemo(() => generateDiableBacks(createRng(deriveSeed(seed, 1)), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [correct, setCorrect] = useState(0);
  const [hiddenAt, setHiddenAt] = useState(-1);
  const [mark, showMark] = useFeedback();
  const total = count + n;
  const done = index >= total;
  const memorizing = index < n;
  const back = memorizing || done ? n : backs[index - n];
  const target = memorizing ? undefined : questions[index - back];
  const shown = index < count ? questions[index] : null;
  const cardText = shown && hiddenAt !== index ? formatCalc(shown) : '…';
  const cardRef = useFitWidth<HTMLDivElement>(cardText);

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  // Niveaux avancés : le calcul affiché s'efface au bout de quelques instants.
  useEffect(() => {
    if (!hideMs || done) return;
    const id = window.setTimeout(() => setHiddenAt(index), slow(hideMs));
    return () => window.clearTimeout(id);
  }, [index, hideMs, done]);

  const advance = (score: number) => {
    const next = index + 1;
    setIndex(next);
    setTyped('');
    if (next === total) {
      clock.stop();
      const elapsedMs = clock.elapsed();
      onFinish({
        score: scoreDiable(score, elapsedMs, level),
        stats: { correct: score, count, n, timeMs: Math.round(elapsedMs) },
        headline: tr(`${score}/${count} justes · ${formatSeconds(elapsedMs)}`, `${score}/${count} correct · ${formatSeconds(elapsedMs)}`),
        lines: [
          { label: tr('Bonnes réponses', 'Correct answers'), value: `${score} / ${count}` },
          { label: tr('Temps', 'Time'), value: formatSeconds(elapsedMs) },
          {
            label: tr('En arrière', 'How far back'),
            value: varying ? tr(`1 à ${n} calculs`, `1 to ${n} sums`) : tr(`${n} calcul${n > 1 ? 's' : ''}`, `${n} sum${n === 1 ? '' : 's'}`),
          },
        ],
      });
    }
  };

  const remember = () => {
    if (!memorizing || done) return;
    fx.tap();
    advance(correct);
  };

  const press = (digit: string) => {
    if (memorizing || done || !target) return;
    const entry = typed + digit;
    if (entry.length < answerLength(target.answer)) {
      setTyped(entry);
      fx.tap();
      return;
    }
    const ok = Number(entry) === target.answer;
    if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', formatSolved(target));
    }
    const score = correct + (ok ? 1 : 0);
    setCorrect(score);
    advance(score);
  };

  const erase = () => {
    if (!typed) return;
    setTyped(typed.slice(0, -1));
  };

  useKeyDown((e) => {
    if (memorizing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      remember();
    } else if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
  }, !done);

  return (
    <div className="game">
      <GameHud progress={Math.max(0, index - n) / count}>
        <Stopwatch clock={clock} />
      </GameHud>
      <div className="game__stage diable">
        <div className="diable__memory" aria-hidden="true">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={`diable__ghost${index - 1 - i >= 0 && index - 1 - i < count ? ' is-full' : ''}${varying && !memorizing && i === back - 1 ? ' is-target' : ''}`}
            >
              ?
            </span>
          ))}
          <span className="diable__now">{tr('maintenant', 'now')}</span>
        </div>
        <div key={index} ref={cardRef} className={`diable__card${cardText === '…' && shown ? ' is-hidden' : ''}`} aria-live="polite">
          {cardText}
        </div>
        <p className="diable__ask">
          {memorizing
            ? tr('Retiens ce calcul, puis touche « Retenu ».', 'Remember this sum, then tap “Got it”.')
            : tr(`Résultat du calcul d’il y a ${back === 1 ? '1 coup' : `${back} coups`} ?`, `Answer to the sum from ${back === 1 ? '1 turn' : `${back} turns`} ago?`)}
        </p>
        {!memorizing && target && (
          <div className="calc__answer" aria-label={tr(`Ta réponse : ${typed || 'vide'}`, `Your answer: ${typed || 'empty'}`)}>
            {Array.from({ length: answerLength(target.answer) }, (_, i) => (
              <span key={i} className={`slot${typed[i] ? ' slot--filled' : ''}`}>
                {typed[i] ?? ''}
              </span>
            ))}
          </div>
        )}
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        {memorizing ? (
          <TapButton className="big-answer" onTap={remember} aria-keyshortcuts="Enter">
            {tr('Retenu', 'Got it')}
            <Icon name="arrow" />
          </TapButton>
        ) : (
          <NumPad onDigit={press} onErase={erase} />
        )}
      </div>
    </div>
  );
}
