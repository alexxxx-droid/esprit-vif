import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import { anagramDeck, anagramLevel, isAnagramAnswer, scoreAnagrammes } from '../../core/games/anagrammes';
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

export function AnagrammesGame({ seed, level, onFinish }: GameProps) {
  const deck = useMemo(() => anagramDeck(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [position, setPosition] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [found, setFound] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [shake, setShake] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const puzzle = deck[position % deck.length];
  const letters = [...puzzle.letters];
  const wordLength = puzzle.word.length;
  const { target, durationMs } = anagramLevel(level);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreAnagrammes(found, level),
      stats: { found, skipped, target },
      headline: tr(`${plural(found, 'mot')} ${found < 2 ? 'trouvé' : 'trouvés'}`, `${plural(found, 'word')} found`),
      lines: [
        { label: tr('Mots trouvés', 'Words found'), value: String(found) },
        { label: tr('Mots passés', 'Words skipped'), value: String(skipped) },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: tr(plural(target, 'mot'), plural(target, 'word')) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= durationMs) {
        window.clearInterval(id);
        clock.stop();
        finish();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock, durationMs]);

  const nextWord = () => {
    setPosition(position + 1);
    setPicked([]);
  };

  const pick = (i: number) => {
    if (over || picked.includes(i)) return;
    const next = [...picked, i];
    if (next.length < wordLength) {
      fx.tap();
      setPicked(next);
      return;
    }
    const attempt = next.map((j) => letters[j]).join('');
    if (isAnagramAnswer(attempt, puzzle)) {
      fx.good();
      showMark('good', attempt === puzzle.word ? undefined : tr(`${attempt} : bien vu !`, `${attempt}: nice find!`));
      setFound(found + 1);
      nextWord();
    } else {
      fx.bad();
      showMark('bad', tr(`« ${attempt} » n’est pas dans la liste`, `“${attempt}” is not in the list`));
      setShake(shake + 1);
      setPicked([]);
    }
  };

  const erase = () => {
    if (over || !picked.length) return;
    fx.tap();
    setPicked(picked.slice(0, -1));
  };

  const skip = () => {
    if (over) return;
    showMark('bad', tr(`C’était ${puzzle.word}`, `It was ${puzzle.word}`));
    setSkipped(skipped + 1);
    nextWord();
  };

  useKeyDown((event) => {
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      const i = letters.findIndex((letter, j) => letter === key && !picked.includes(j));
      if (i >= 0) pick(i);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      erase();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      skip();
    }
  }, !over);

  const columns = letters.length <= 5 ? letters.length : Math.ceil(letters.length / 2);
  const answerSoFar = picked.map((j) => letters[j]).join('');

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={durationMs} />
      </GameHud>
      <div className="game__stage anagram">
        <p className="anagram__found">
          <strong>{found}</strong> / {target} {tr('mots', 'words')}
        </p>
        <div
          key={shake}
          className={`anagram__slots${shake ? ' shake' : ''}`}
          aria-live="polite"
          aria-label={tr(`Ta réponse : ${answerSoFar || 'vide'}`, `Your answer: ${answerSoFar || 'empty'}`)}
        >
          {Array.from({ length: wordLength }, (_, i) => (
            <span key={i} className={`anagram__slot${picked[i] !== undefined ? ' is-filled' : ''}`}>
              {picked[i] !== undefined ? letters[picked[i]] : ''}
            </span>
          ))}
        </div>
        <div key={position} className="anagram__tiles" style={{ '--columns': columns } as CSSProperties} role="group" aria-label={tr('Lettres', 'Letters')}>
          {letters.map((letter, i) => (
            <TapButton
              key={i}
              className={`tile${picked.includes(i) ? ' is-used' : ''}`}
              onTap={() => pick(i)}
              disabled={picked.includes(i)}
              aria-label={letter}
            >
              {letter}
            </TapButton>
          ))}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls anagram__actions">
        <TapButton className="btn btn--lg" onTap={erase} disabled={!picked.length}>
          <Icon name="erase" />
          {tr('Effacer', 'Erase')}
        </TapButton>
        <TapButton className="btn btn--lg" onTap={skip} aria-keyshortcuts="Enter">
          {tr('Passer', 'Skip')}
          <Icon name="arrow" />
        </TapButton>
      </div>
    </div>
  );
}
