import { useEffect, useEffectEvent, useMemo, useState, type CSSProperties } from 'react';
import { lang, tr } from '../../core/lang';
import { generateQui, quiLevel, scoreQui, type Person } from '../../core/games/quiestqui';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Mascot } from '../components/Mascot';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { useKeyDown } from '../hooks';
import { slow } from '../tempo';

/** Un visage : le compagnon sur sa couleur de fond. */
export function PersonFace({ person, size = 64 }: { person: Pick<Person, 'character' | 'color'>; size?: number }) {
  return (
    <span className={`avatar avatar--c${person.color} qui-face`} style={{ width: size, height: size }} data-face={`${person.character}-${person.color}`} aria-hidden="true">
      <Mascot character={person.character} mood="happy" size={size * 0.92} still />
    </span>
  );
}

/** Le temps de voir si l'on a eu juste avant la question suivante. */
const REVEAL_MS = 800;

export function QuiGame({ seed, level, onFinish }: GameProps) {
  const config = quiLevel(level);
  const rounds = useMemo(() => generateQui(createRng(seed), level), [seed, level]);
  const total = rounds.reduce((sum, r) => sum + r.questions.length, 0);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'study' | 'quiz'>('study');
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const { people, questions } = rounds[round];
  const question = questions[index];
  const studyMs = slow(config.studyMs * config.people);
  const done = rounds.slice(0, round).reduce((sum, r) => sum + r.questions.length, 0) + index;

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreQui(correct, total),
      stats: { correct, total, people: config.people },
      headline: tr(`${correct} sur ${total} reconnus`, `${correct} of ${total} recognized`),
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: `${correct} / ${total}` },
        { label: tr('Visages par manche', 'Faces per round'), value: String(config.people) },
      ],
    });
  });

  // Fin de l'étude : les questions commencent (on peut aussi s'estimer prêt plus tôt).
  useEffect(() => {
    if (phase !== 'study') return;
    const id = window.setTimeout(() => setPhase('quiz'), studyMs);
    return () => window.clearTimeout(id);
  }, [phase, round, studyMs]);

  // Après chaque réponse : question suivante, manche suivante, ou fin de partie.
  useEffect(() => {
    if (picked === null) return;
    const id = window.setTimeout(() => {
      setPicked(null);
      if (index + 1 < questions.length) setIndex(index + 1);
      else if (round + 1 < rounds.length) {
        setRound(round + 1);
        setIndex(0);
        setPhase('study');
      } else finish();
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [picked, index, questions.length, round, rounds.length]);

  const choose = (option: number) => {
    if (over || phase !== 'quiz' || picked !== null) return;
    setPicked(option);
    if (option === question.target) {
      fx.good();
      showMark('good');
      setCorrect(correct + 1);
    } else {
      fx.bad();
      const name = people[question.target].name;
      showMark('bad', question.kind === 'face' ? tr(`Voici ${name}`, `This is ${name}`) : tr(`C’était ${name}`, `It was ${name}`));
    }
  };

  useKeyDown((e) => {
    const n = Number(e.key);
    if (phase === 'quiz' && n >= 1 && n <= question.options.length) choose(question.options[n - 1]);
    else if (phase === 'study' && e.key === 'Enter') setPhase('quiz');
  }, !over);

  const state = (option: number) => (picked === null ? '' : option === question.target ? ' is-answer' : option === picked ? ' is-wrong' : ' is-dim');

  return (
    <div className="game">
      <GameHud progress={done / total} />
      {phase === 'study' ? (
        <>
          <div className="game__stage qui">
            <p className="qui__round">
              {tr('Manche', 'Round')} {round + 1}/{rounds.length}
            </p>
            <p className="lettre__ask">{tr('Retiens qui est qui', 'Remember who’s who')}</p>
            <div key={round} className={`qui-grid qui-grid--${people.length}`}>
              {people.map((p, i) => (
                <div key={i} className="qui-person" style={{ '--i': i } as CSSProperties}>
                  <PersonFace person={p} />
                  <span className="qui-person__name">{p.name}</span>
                </div>
              ))}
            </div>
            <span className="qui__timer" aria-hidden="true">
              <span key={round} style={{ animationDuration: `${studyMs}ms` }} />
            </span>
          </div>
          <div className="game__controls">
            <button type="button" className="btn btn--primary btn--lg qui__ready" onClick={() => setPhase('quiz')}>
              {tr('J’ai retenu', 'Got it')}
            </button>
          </div>
        </>
      ) : question.kind === 'face' ? (
        <>
          <div className="game__stage qui">
            <p className="qui__prompt" key={`${round}-${index}`}>
              {lang() === 'en' ? (
                <>
                  Who is <strong>{people[question.target].name}</strong>?
                </>
              ) : (
                <>
                  Qui est <strong>{people[question.target].name}</strong>&nbsp;?
                </>
              )}
            </p>
            <FeedbackMark mark={mark} />
          </div>
          <div className={`game__controls qui-grid qui-grid--${people.length}`}>
            {question.options.map((option, k) => (
              <TapButton
                key={option}
                className={`qui-pick${state(option)}`}
                onTap={() => choose(option)}
                aria-label={tr(`Visage ${k + 1}`, `Face ${k + 1}`)}
                aria-keyshortcuts={k < 9 ? String(k + 1) : undefined}
              >
                <PersonFace person={people[option]} />
                {picked !== null && option === question.target && <span className="qui-person__name">{people[option].name}</span>}
              </TapButton>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="game__stage qui">
            <PersonFace key={`${round}-${index}`} person={people[question.target]} size={112} />
            <p className="qui__prompt">{tr('Quel est son prénom\u00a0?', 'What’s their name?')}</p>
            <FeedbackMark mark={mark} />
          </div>
          <div className="game__controls qui-names">
            {question.options.map((option, k) => (
              <TapButton key={option} className={`lettre__option qui-name${state(option)}`} onTap={() => choose(option)} aria-keyshortcuts={String(k + 1)}>
                {people[option].name}
              </TapButton>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
