import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { CATEGORIES_DURATION_MS, categoriesLevel, generateCategories, scoreCategories } from '../../core/games/categories';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useKeyDown } from '../hooks';

export function CategoriesGame({ seed, level, onFinish }: GameProps) {
  const config = categoriesLevel(level);
  const questions = useMemo(() => generateCategories(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const q = questions[index % questions.length];

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreCategories(correct, errors, level),
      stats: { correct, errors },
      headline: `${plural(correct, 'intrus trouvé', 'intrus trouvés')} · ${plural(errors, 'erreur')}`,
      lines: [
        { label: 'Intrus trouvés', value: String(correct) },
        { label: 'Erreurs', value: errors ? String(errors) : 'Aucune' },
        { label: 'Objectif pour 100 pts', value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= CATEGORIES_DURATION_MS) {
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
      showMark('bad', `C’était « ${q.words[q.answer]} »`);
      setErrors(errors + 1);
    }
    // Rappel discret de la solution, le temps de la question suivante.
    setLastAnswer(`Avant : « ${q.words[q.answer]} » au milieu ${q.main.plural}`);
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= Math.min(9, config.words)) choose(n - 1);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={CATEGORIES_DURATION_MS} />
      </GameHud>
      <div className="game__stage categories">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <p className="categories__ask">Trouve l’intrus</p>
        <div key={index} className={`categories__words${config.words > 6 ? ' categories__words--dense' : ''}`}>
          {q.words.map((word, i) => (
            <TapButton key={word} className="categories__word" onTap={() => choose(i)} aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}>
              {word}
            </TapButton>
          ))}
        </div>
        <p className="categories__last" aria-live="polite">
          {lastAnswer}
        </p>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
