import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { ALPHABET, generatePendu, PENDU_DURATION_MS, penduLevel, scorePendu, solved } from '../../core/games/pendu';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

/** Le mot : une case par lettre, vide tant qu'elle n'est pas trouvée (toutes montrées à la fin). */
export function PenduSlots({ letters, known, reveal = false }: { letters: string; known: readonly string[]; reveal?: boolean }) {
  return (
    <div className={`pendu__word${letters.length > 8 ? ' pendu__word--long' : ''}`} aria-label={tr('Le mot à deviner', 'The word to guess')}>
      {[...letters].map((l, i) => (
        <span key={i} className={`pendu__slot${known.includes(l) ? ' is-known' : reveal ? ' is-revealed' : ''}`}>
          {known.includes(l) || reveal ? l : ''}
        </span>
      ))}
    </div>
  );
}

export function PenduGame({ seed, level, onFinish }: GameProps) {
  const c = penduLevel(level);
  const words = useMemo(() => generatePendu(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const [found, setFound] = useState(0);
  const [lost, setLost] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const word = words[index % words.length];
  const known = [...word.given, ...tried];
  const wrong = tried.filter((l) => !word.letters.includes(l)).length;

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scorePendu(found, level),
      stats: { found, lost },
      headline: tr(byCount(found, `${found} mot trouvé`, `${found} mots trouvés`), plural(found, 'word found', 'words found')),
      lines: [
        { label: tr('Mots trouvés', 'Words found'), value: String(found) },
        { label: tr('Mots perdus', 'Words lost'), value: lost ? String(lost) : tr('Aucun', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= PENDU_DURATION_MS) {
        window.clearInterval(id);
        clock.stop();
        finish();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock]);

  const next = (wasFound: boolean) => {
    setReveal(true);
    window.setTimeout(
      () => {
        setReveal(false);
        setTried([]);
        setIndex((i) => i + 1);
      },
      slow(wasFound ? 600 : 1500),
    );
  };

  const guess = (letter: string) => {
    if (over || reveal || known.includes(letter)) return;
    const all = [...tried, letter];
    setTried(all);
    if (!word.letters.includes(letter)) {
      fx.bad();
      if (all.filter((l) => !word.letters.includes(l)).length >= c.lives) {
        showMark('bad', word.word);
        setLost(lost + 1);
        next(false);
      }
      return;
    }
    fx.tap();
    if (solved(word, all)) {
      fx.good();
      showMark('good');
      setFound(found + 1);
      next(true);
    }
  };

  useKeyDown((e) => {
    const l = e.key.toUpperCase();
    if (/^[A-Z]$/.test(l)) guess(l);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={PENDU_DURATION_MS} />
      </GameHud>
      <div className="game__stage pendu">
        <p className="anagram__found">
          <strong>{found}</strong> / {c.target}
        </p>
        <p className="pendu__hint">{c.hint ? tr(`Famille : ${word.family}`, `Family: ${word.family}`) : tr('Sans indice', 'No clue')}</p>
        <PenduSlots key={index} letters={word.letters} known={known} reveal={reveal} />
        <p className="pendu__lives" aria-label={tr(`${c.lives - wrong} erreurs encore permises`, `${c.lives - wrong} mistakes left`)}>
          {Array.from({ length: c.lives }, (_, i) => (
            <span key={i} className={`pendu__life${i < wrong ? ' is-used' : ''}`} />
          ))}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls pendu__keys" role="group" aria-label={tr('Les lettres', 'The letters')}>
        {ALPHABET.map((l) => {
          const used = known.includes(l);
          const state = used ? (word.letters.includes(l) ? ' is-good' : ' is-bad') : '';
          return (
            <TapButton key={l} className={`pendu__key${state}`} onTap={() => guess(l)} disabled={over || reveal || used}>
              {l}
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}
