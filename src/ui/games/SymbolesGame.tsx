import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { tr } from '../../core/lang';
import { generateSymboles, scoreSymboles, SYMBOLES_DURATION_MS, SYMBOLES_PEEK_MS, symbolesLevel, tableAt } from '../../core/games/symboles';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { slow } from '../tempo';
import { ShapeGlyph } from './echo-shapes';

/** Une forme seule, à l'encre : ici la couleur ne compte pas, seule la forme. */
export function Glyph({ shape, size }: { shape: number; size: number }) {
  return (
    <svg className="sym__glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ShapeGlyph color={shape} />
    </svg>
  );
}

export function SymbolesGame({ seed, level, onFinish }: GameProps) {
  const c = symbolesLevel(level);
  const game = useMemo(() => generateSymboles(createRng(seed), level), [seed, level]);
  const shapes = useMemo(() => [...new Set(game.sequence)].sort((a, b) => game.tables[0][a] - game.tables[0][b]), [game]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const table = tableAt(c, game, index);
  const shape = game.sequence[index % game.sequence.length];
  // La table se lit dans l'ordre des chiffres.
  const keyOrder = [...shapes].sort((a, b) => table[a] - table[b]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreSymboles(correct, errors, level),
      stats: { correct, errors },
      headline: `${tr(`${correct} symboles codés`, `${correct} symbols coded`)} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Bonnes réponses', 'Correct answers'), value: String(correct) },
        { label: tr('Erreurs', 'Errors'), value: errors ? String(errors) : tr('Aucune', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= SYMBOLES_DURATION_MS) {
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

  // La table se cache au bout de quelques secondes (paliers Maître et Légende).
  useEffect(() => {
    if (!c.hideMs) return;
    const id = window.setTimeout(() => setHidden(true), slow(c.hideMs));
    return () => window.clearTimeout(id);
  }, [c.hideMs]);

  const peek = () => {
    if (over || peeking) return;
    fx.tap();
    setPeeking(true);
    // Le coup d'œil coûte du temps : la table reste visible, mais on ne peut pas répondre.
    window.setTimeout(() => setPeeking(false), slow(SYMBOLES_PEEK_MS));
  };

  const answer = (digit: number) => {
    if (over || peeking) return;
    if (digit === table[shape]) {
      fx.good();
      setCorrect(correct + 1);
    } else {
      fx.bad();
      showMark('bad', tr(`C’était ${table[shape]}`, `It was ${table[shape]}`));
      setErrors(errors + 1);
    }
    const next = index + 1;
    if (c.shuffleEvery && next % c.shuffleEvery === 0) showMark('good', tr('Nouvelle table !', 'New table!'));
    setIndex(next);
  };

  const showTable = !hidden || peeking;
  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={SYMBOLES_DURATION_MS} />
      </GameHud>
      <div className="game__stage sym">
        <p className="anagram__found">
          <strong>{correct - errors > 0 ? correct - errors : 0}</strong> / {c.target}
        </p>
        <div className={`sym__table sym__table--${c.symbols}`} key={c.shuffleEvery ? Math.floor(index / c.shuffleEvery) : 0} aria-label={tr('La table des symboles', 'The symbol table')}>
          {keyOrder.map((s) => (
            <span key={s} className="sym__pair">
              <Glyph shape={s} size={26} />
              <strong>{showTable ? table[s] : '?'}</strong>
            </span>
          ))}
        </div>
        {hidden && (
          <TapButton className="btn btn--ghost btn--sm" onTap={peek} disabled={over || peeking}>
            {peeking ? tr('Regarde bien…', 'Look closely…') : tr('Revoir la table (2 s)', 'See the table (2 s)')}
          </TapButton>
        )}
        <div key={index} className="sym__current" aria-label={tr('Le symbole à coder', 'The symbol to code')}>
          <Glyph shape={shape} size={92} />
        </div>
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls">
        <div className={`sym__pad sym__pad--${c.symbols}`} role="group" aria-label={tr('Les chiffres', 'The numbers')}>
          {game.pad.map((d) => (
            <TapButton key={d} className="numpad__key" onTap={() => answer(d)} disabled={over || peeking}>
              {d}
            </TapButton>
          ))}
        </div>
      </div>
    </div>
  );
}
