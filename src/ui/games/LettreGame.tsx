import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { generateLettre, LETTRE_DURATION_MS, lettreLevel, scoreLettre, type LettreQuestion } from '../../core/games/lettre';
import { tr } from '../../core/lang';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

/** Le mot, lettre par lettre ; les cases manquantes restent vides (ou montrent les lettres choisies). */
export function WordTiles({ question, filled }: { question: Pick<LettreQuestion, 'word' | 'positions'>; filled?: string }) {
  return (
    <span className="word-tiles" aria-hidden="true">
      {[...question.word].map((letter, i) => {
        const slot = question.positions.indexOf(i);
        return (
          <span key={i} className={`word-tile${slot >= 0 ? ' word-tile--blank' : ''}${slot >= 0 && filled ? ' is-filled' : ''}`}>
            {slot >= 0 ? (filled?.[slot] ?? '') : letter}
          </span>
        );
      })}
    </span>
  );
}

export function LettreGame({ seed, level, onFinish }: GameProps) {
  const config = lettreLevel(level);
  const questions = useMemo(() => generateLettre(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const q = questions[index % questions.length];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreLettre(correct, errors, level),
      stats: { correct, errors },
      headline: tr(
        `${plural(correct, 'mot complété', 'mots complétés')} · ${plural(errors, 'erreur')}`,
        `${plural(correct, 'word completed', 'words completed')} · ${plural(errors, 'error')}`,
      ),
      lines: [
        { label: tr('Mots complétés', 'Words completed'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= LETTRE_DURATION_MS) {
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

  const choose = (option: number) => {
    if (over) return;
    if (option === q.answer) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', tr(`C’était ${q.word}`, `It was ${q.word}`));
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= config.options) choose(n - 1);
    else if (config.missing === 1 && /^[a-z]$/i.test(e.key)) {
      const option = q.options.indexOf(e.key.toUpperCase());
      if (option >= 0) choose(option);
    }
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={LETTRE_DURATION_MS} />
      </GameHud>
      <div className="game__stage lettre">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        {config.noHint ? (
          <p className="lettre__hint lettre__hint--none">{tr('Sans indice', 'No hint')}</p>
        ) : (
          <p key={`h${index}`} className="lettre__hint">
            {q.hint}
          </p>
        )}
        <div key={index} className="lettre__word">
          <WordTiles question={q} />
        </div>
        <p className="sr-only">
          {config.noHint ? '' : tr(`${q.hint} : `, `${q.hint}: `)}
          {[...q.word].map((letter, i) => (q.positions.includes(i) ? tr('blanc', 'blank') : letter)).join(' ')}
        </p>
        <p className="lettre__ask">
          {config.missing === 1
            ? tr('Quelle lettre manque-t-il ?', 'Which letter is missing?')
            : tr('Quelles lettres manque-t-il ?', 'Which letters are missing?')}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className={`game__controls lettre__options lettre__options--${config.options}${config.missing >= 3 ? ' lettre__options--multi' : ''}`}>
        {q.options.map((option, i) => (
          <TapButton key={`${index}-${i}`} className="lettre__option" onTap={() => choose(i)} aria-keyshortcuts={String(i + 1)}>
            {/* Trois ou quatre lettres : de simples espaces, pour tenir sur deux colonnes même à 360 px. */}
            {option.split('').join(config.missing >= 3 ? ' ' : ' · ')}
          </TapButton>
        ))}
      </div>
    </div>
  );
}
