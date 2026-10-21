import { useEffect, useMemo, useState } from 'react';
import { tr } from '../../core/lang';
import { generateManque, MANQUE_ROUNDS, manqueLevel, scoreManque, type Item } from '../../core/games/manque';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { slow } from '../tempo';
import { ShapeGlyph } from './echo-shapes';

/** Une forme colorée (couleurs d'Écho, formes partagées). */
export function ItemView({ item, size }: { item: Item | null; size: number }) {
  return (
    <span className={`manque__item${item ? ` echo__pad--${item.color}` : ' is-empty'}`} style={{ width: size, height: size }}>
      {item && (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true">
          <ShapeGlyph color={item.shape} />
        </svg>
      )}
    </span>
  );
}

type Phase = 'study' | 'answer' | 'pause';

export function ManqueGame({ seed, level, onFinish }: GameProps) {
  const c = manqueLevel(level);
  const rounds = useMemo(() => generateManque(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('study');
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [won, setWon] = useState(0);
  const [mark, showMark] = useFeedback();
  const round = rounds[Math.min(index, rounds.length - 1)];
  const goneKeys = round.gone.map((k) => `${round.shown[k].shape}-${round.shown[k].color}`);
  const size = c.items > 6 ? 62 : 70;

  const finish = (total: number) => {
    onFinish({
      score: scoreManque(total, level),
      stats: { won: total, rounds: MANQUE_ROUNDS },
      headline: tr(`${total} sur ${MANQUE_ROUNDS} retrouvées`, `${total} of ${MANQUE_ROUNDS} found`),
      lines: [
        { label: tr('Manches réussies', 'Rounds won'), value: `${total} / ${MANQUE_ROUNDS}` },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  };

  // L'étude : toute la série, ou les formes une par une.
  useEffect(() => {
    if (phase !== 'study') return;
    const last = !c.sequential || step + 1 >= round.shown.length;
    const id = window.setTimeout(() => (last ? setPhase('answer') : setStep(step + 1)), slow(c.studyMs));
    return () => window.clearTimeout(id);
  }, [phase, step, c, round]);

  const pick = (k: number) => {
    if (phase !== 'answer' || picked.includes(k)) return;
    fx.tap();
    const next = [...picked, k];
    if (next.length < c.missing) {
      setPicked(next);
      return;
    }
    const ok = next.every((p) => goneKeys.includes(`${round.options[p].shape}-${round.options[p].color}`));
    const total = won + (ok ? 1 : 0);
    if (ok) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad');
    }
    setWon(total);
    setPicked(next);
    setPhase('pause');
    window.setTimeout(() => {
      if (index + 1 >= MANQUE_ROUNDS) {
        finish(total);
        return;
      }
      setIndex(index + 1);
      setPicked([]);
      setStep(0);
      setPhase('study');
    }, slow(ok ? 600 : 1300));
  };

  const studying = phase === 'study';
  const visible = studying ? (c.sequential ? round.shown.slice(step, step + 1) : round.shown) : round.rest;
  return (
    <div className="game">
      <GameHud progress={(index + (phase === 'pause' ? 1 : 0)) / MANQUE_ROUNDS} />
      <div className="game__stage manque">
        <p className="anagram__found">
          {tr('Manche', 'Round')} <strong>{index + 1}</strong> / {MANQUE_ROUNDS} · {won} ✓
        </p>
        <p className="lettre__ask" aria-live="polite">
          {studying ? tr('Retiens ces formes…', 'Remember these shapes…') : c.missing === 2 ? tr('Lesquelles ont disparu ?', 'Which two are gone?') : tr('Laquelle a disparu ?', 'Which one is gone?')}
        </p>
        <div key={`${index}-${phase === 'study'}`} className={`manque__set${c.sequential && studying ? ' manque__set--one' : ''}`}>
          {visible.map((item, k) => (
            <ItemView key={k} item={item} size={c.sequential && studying ? 110 : size} />
          ))}
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <div className={`manque__options manque__options--${round.options.length}`} role="group" aria-label={tr('Les propositions', 'The choices')}>
          {round.options.map((item, k) => {
            const isGone = goneKeys.includes(`${item.shape}-${item.color}`);
            const state = phase === 'pause' ? (isGone ? ' is-right' : picked.includes(k) ? ' is-wrong' : '') : picked.includes(k) ? ' is-picked' : '';
            return (
              <TapButton key={k} className={`manque__option${state}`} onTap={() => pick(k)} disabled={phase !== 'answer'} aria-label={tr(`Proposition ${k + 1}`, `Choice ${k + 1}`)}>
                {/* Pendant l'étude, les propositions restent cachées : elles aideraient trop. */}
                {studying ? null : <ItemView item={item} size={48} />}
              </TapButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
