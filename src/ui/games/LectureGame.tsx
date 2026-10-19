import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { generateLecture, LECTURE_DURATION_MS, lectureLevel, scoreLecture } from '../../core/games/lecture';
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

export function LectureGame({ seed, level, onFinish }: GameProps) {
  const config = lectureLevel(level);
  const questions = useMemo(() => generateLecture(createRng(seed), level), [seed, level]);
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
      score: scoreLecture(correct, errors, level),
      stats: { correct, errors },
      headline: `${plural(correct, 'bonne réponse', 'bonnes réponses')} · ${plural(errors, 'erreur')}`,
      lines: [
        { label: 'Phrases bien jugées', value: String(correct) },
        { label: 'Erreurs', value: errors ? String(errors) : 'Aucune' },
        { label: 'Objectif pour 100 pts', value: `${config.target} (erreurs déduites)` },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= LECTURE_DURATION_MS) {
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

  const judge = (truth: boolean) => {
    if (over) return;
    if (truth === q.truth) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', q.truth ? 'C’était vrai' : 'C’était faux');
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'v') judge(true);
    else if (key === 'arrowright' || key === 'f') judge(false);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={LECTURE_DURATION_MS} />
      </GameHud>
      <div className="game__stage lecture">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        <p key={index} className="lecture__sentence" aria-live="polite">
          {q.sentence}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls lecture__options">
        <TapButton className="lecture__option lecture__option--true" onTap={() => judge(true)} aria-keyshortcuts="V ArrowLeft">
          <Icon name="check" size={26} strokeWidth={3} />
          Vrai
        </TapButton>
        <TapButton className="lecture__option lecture__option--false" onTap={() => judge(false)} aria-keyshortcuts="F ArrowRight">
          <Icon name="close" size={26} strokeWidth={3} />
          Faux
        </TapButton>
      </div>
    </div>
  );
}
