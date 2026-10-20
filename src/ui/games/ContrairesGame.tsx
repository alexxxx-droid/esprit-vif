import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { NBSP, plural } from '../../core/format';
import {
  CONTRAIRES_DURATION_MS,
  contrairesLevel,
  generateContraires,
  scoreContraires,
  type ChoiceQuestion,
  type JudgeQuestion,
  type Link,
} from '../../core/games/contraires';
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
import { slow } from '../tempo';
import { useFitWidth } from './fit-text';

const LINKS: readonly Link[] = ['contraire', 'synonyme', 'aucun'];

/** Les trois réponses du palier Légende. */
function linkName(link: Link): string {
  if (link === 'contraire') return tr('Contraires', 'Opposites');
  if (link === 'synonyme') return tr('Même sens', 'Same meaning');
  return tr('Sans rapport', 'Unrelated');
}

/** Ce qu'il fallait répondre au palier Légende, sous la croix d'une erreur. */
function linkAnswer(link: Link): string {
  if (link === 'contraire') return tr('Ce sont des contraires', 'They are opposites');
  if (link === 'synonyme') return tr('Ils ont le même sens', 'They mean the same');
  return tr('Ils sont sans rapport', 'They are unrelated');
}

/** Pictogramme d'un lien : deux flèches opposées, le signe égal, un trait rompu. */
function LinkGlyph({ link, size = 20 }: { link: Link; size?: number }) {
  const d = { contraire: 'M3.5 12h17M7.5 8l-4 4 4 4M16.5 8l4 4-4 4', synonyme: 'M5 9h14M5 15h14', aucun: 'M3.5 12h5M15.5 12h5M13.5 6.5l-3 11' }[link];
  return (
    <span className={`contraires__glyph contraires__glyph--${link}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  );
}

/** Un mot sur une ligne : sa police rétrécit s'il ne tient pas dans la largeur. */
function FitWord({ word, className }: { word: string; className: string }) {
  const ref = useFitWidth<HTMLSpanElement>(word);
  return (
    <span ref={ref} className={className}>
      {word}
    </span>
  );
}

function ChoiceCard({ q }: { q: ChoiceQuestion }) {
  return (
    <div className={`contraires__card contraires__card--${q.ask}`} aria-live="polite">
      <span className={`contraires__ask contraires__ask--${q.ask}`}>
        <LinkGlyph link={q.ask} size={18} />
        {q.ask === 'contraire' ? tr('Le contraire de', 'The opposite of') : tr('Le même sens que', 'Same meaning as')}
      </span>
      <FitWord word={q.word} className="contraires__word" />
    </div>
  );
}

function JudgeCard({ q, fuseMs }: { q: JudgeQuestion; fuseMs: number }) {
  return (
    <div className="contraires__card contraires__card--judge" aria-live="polite">
      <FitWord word={q.words[0]} className="contraires__word contraires__word--pair" />
      <span className="contraires__and" aria-hidden="true">
        ?
      </span>
      <FitWord word={q.words[1]} className="contraires__word contraires__word--pair" />
      <span className="contraires__fuse" style={{ '--fuse': `${fuseMs}ms` } as CSSProperties} aria-hidden="true" />
    </div>
  );
}

export function ContrairesGame({ seed, level, onFinish }: GameProps) {
  const config = contrairesLevel(level);
  const questions = useMemo(() => generateContraires(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const q = questions[index % questions.length];
  // Palier Légende : chaque paire a sa mèche ; au bout, elle compte comme une erreur.
  const fuseMs = config.judgeMs ? slow(config.judgeMs) : null;

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreContraires(correct, errors, level),
      stats: { correct, errors },
      headline: `${tr(plural(correct, 'bonne réponse', 'bonnes réponses'), plural(correct, 'correct answer'))} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: tr(`${config.target} (erreurs déduites)`, `${config.target} (minus errors)`) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= CONTRAIRES_DURATION_MS) {
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

  const answer = (ok: boolean, detail: string) => {
    if (ok) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', detail);
      setErrors(errors + 1);
    }
    setIndex(index + 1);
  };

  const choose = (option: number) => {
    if (over || q.type !== 'choice') return;
    const right = q.options[q.answer];
    answer(option === q.answer, tr(`C’était «${NBSP}${right}${NBSP}»`, `It was “${right}”`));
  };

  const judge = (link: Link) => {
    if (over || q.type !== 'judge') return;
    answer(link === q.link, linkAnswer(q.link));
  };

  const tooSlow = useEffectEvent(() => {
    if (!over && q.type === 'judge') answer(false, `${tr('Trop lent', 'Too slow')} · ${linkAnswer(q.link)}`);
  });

  useEffect(() => {
    if (fuseMs === null || over) return;
    const id = window.setTimeout(() => tooSlow(), fuseMs);
    return () => window.clearTimeout(id);
  }, [index, fuseMs, over]);

  useKeyDown((e) => {
    const n = Number(e.key);
    if (q.type === 'choice' && n >= 1 && n <= q.options.length) choose(n - 1);
    else if (q.type === 'judge' && n >= 1 && n <= LINKS.length) judge(LINKS[n - 1]);
  }, !over);

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={CONTRAIRES_DURATION_MS} />
      </GameHud>
      <div className="game__stage contraires">
        <p className="anagram__found">
          <strong>{correct}</strong> / {config.target}
        </p>
        {q.type === 'choice' ? <ChoiceCard key={index} q={q} /> : <JudgeCard key={index} q={q} fuseMs={fuseMs ?? 0} />}
        <FeedbackMark mark={mark} />
      </div>
      {q.type === 'choice' ? (
        <div className="game__controls contraires__options">
          {q.options.map((word, i) => (
            <TapButton key={`${index}-${word}`} className="contraires__option" onTap={() => choose(i)} aria-keyshortcuts={String(i + 1)}>
              <FitWord word={word} className="contraires__fit" />
            </TapButton>
          ))}
        </div>
      ) : (
        <div className="game__controls contraires__links">
          {LINKS.map((link, i) => (
            <TapButton key={link} className={`contraires__link contraires__link--${link}`} onTap={() => judge(link)} aria-keyshortcuts={String(i + 1)}>
              <LinkGlyph link={link} size={22} />
              {linkName(link)}
            </TapButton>
          ))}
        </div>
      )}
    </div>
  );
}
