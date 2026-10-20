import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { plural } from '../../core/format';
import { generateLecture, LECTURE_DURATION_MS, lectureFlashMs, lectureLevel, scoreLecture } from '../../core/games/lecture';
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
  // Phrase éclair (palier Légende) : la phrase s'efface au bout de quelques secondes, on peut encore répondre.
  const flashMs = lectureFlashMs(q.sentence, level);
  const [hiddenIndex, setHiddenIndex] = useState(-1);
  const hidden = hiddenIndex === index;

  useEffect(() => {
    if (flashMs === null || over) return;
    const id = window.setTimeout(() => setHiddenIndex(index), flashMs);
    return () => window.clearTimeout(id);
  }, [index, flashMs, over]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreLecture(correct, errors, level),
      stats: { correct, errors },
      headline: `${tr(plural(correct, 'bonne réponse', 'bonnes réponses'), plural(correct, 'correct answer'))} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Phrases bien jugées', 'Sentences judged right'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: tr(`${config.target} (erreurs déduites)`, `${config.target} (minus errors)`) },
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
      showMark('bad', q.truth ? tr('C’était vrai', 'It was true') : tr('C’était faux', 'It was false'));
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  useKeyDown((e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === tr('v', 't')) judge(true);
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
        <p key={index} className={`lecture__sentence${hidden ? ' is-hidden' : ''}`} aria-live="polite">
          <span className="lecture__text">{q.sentence}</span>
          {flashMs !== null && <span className="lecture__fuse" style={{ '--flash': `${flashMs}ms` } as CSSProperties} aria-hidden="true" />}
        </p>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls lecture__options">
        <TapButton className="lecture__option lecture__option--true" onTap={() => judge(true)} aria-keyshortcuts={tr('V ArrowLeft', 'T ArrowLeft')}>
          <Icon name="check" size={26} strokeWidth={3} />
          {tr('Vrai', 'True')}
        </TapButton>
        <TapButton className="lecture__option lecture__option--false" onTap={() => judge(false)} aria-keyshortcuts="F ArrowRight">
          <Icon name="close" size={26} strokeWidth={3} />
          {tr('Faux', 'False')}
        </TapButton>
      </div>
    </div>
  );
}
