import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { plural } from '../../core/format';
import { generateLucioles, isCatchable, LUCIOLES_DURATION_MS, luciolesLevel, scoreLucioles, type LucioleKind } from '../../core/games/lucioles';
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

/** Une luciole de la vague en cours : où elle est, et ce qu'elle est devenue. */
interface Live {
  kind: LucioleKind;
  cell: number;
  hopTo?: number;
  hopped: boolean;
  /** Appuis encore nécessaires (2 pour une dorée). */
  tapsLeft: number;
  done: 'caught' | 'missed' | 'avoided' | 'touched' | null;
}

interface Tally {
  caught: number;
  missed: number;
  wrong: number;
  rts: number[];
}

/** Petit éclat sur une case : luciole attrapée, ou éteinte avant d'être prise. */
interface Flash {
  cell: number;
  kind: 'caught' | 'missed';
  id: number;
}

/** Touches du pavé numérique pour la grille de 3 × 3 (7 8 9 en haut, comme sur un pavé). */
const NUMPAD_3: Record<string, number> = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };

export function LuciolesGame({ seed, level, onFinish }: GameProps) {
  const config = luciolesLevel(level);
  const waves = useMemo(() => generateLucioles(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'gap' | 'lit'>('gap');
  const [live, setLive] = useState<Live[]>([]);
  const [tally, setTally] = useState<Tally>({ caught: 0, missed: 0, wrong: 0, rts: [] });
  const [flash, setFlash] = useState<Flash | null>(null);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const litAt = useRef(0);
  const flashId = useRef(0);
  const wave = waves[index % waves.length];
  const cells = config.size * config.size;

  const finish = useEffectEvent(() => {
    setOver(true);
    const mean = tally.rts.length ? Math.round(tally.rts.reduce((a, b) => a + b, 0) / tally.rts.length) : 0;
    const errors = tally.missed + tally.wrong;
    onFinish({
      score: scoreLucioles(tally.caught, tally.missed, tally.wrong, level),
      stats: { correct: tally.caught, errors, meanRt: mean },
      headline: `${tr(plural(tally.caught, 'luciole attrapée', 'lucioles attrapées'), plural(tally.caught, 'firefly caught', 'fireflies caught'))} · ${tr(plural(errors, 'erreur'), plural(errors, 'error'))}`,
      lines: [
        { label: tr('Lucioles attrapées', 'Fireflies caught'), value: String(tally.caught) },
        { label: tr('Éteintes avant d’être prises', 'Went out before being caught'), value: tally.missed ? String(tally.missed) : tr('Aucune', 'None') },
        { label: tr('Mauvais appuis', 'Wrong taps'), value: tally.wrong ? String(tally.wrong) : tr('Aucun', 'None') },
        { label: tr('Temps de réaction moyen', 'Average reaction time'), value: mean ? `${mean} ms` : '—' },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  // La partie dure 60 s, quoi qu'il arrive.
  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= LUCIOLES_DURATION_MS) {
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

  const showFlash = (cell: number, kind: Flash['kind']) => {
    flashId.current += 1;
    setFlash({ cell, kind, id: flashId.current });
  };

  /**
   * Fin de vague : les lucioles encore allumées s'éteignent (ratées si on devait les prendre, les rouges
   * laissées tranquilles sont un bon réflexe). Appelée à la fin de la fenêtre, ou dès que tout est pris.
   */
  const closeWave = (current: Live[]) => {
    const missed = current.filter((l) => !l.done && isCatchable(l));
    if (missed.length) {
      fx.bad();
      showFlash(missed[0].cell, 'missed');
      setTally((t) => ({ ...t, missed: t.missed + missed.length }));
    }
    setLive(current.map((l) => (l.done ? l : { ...l, done: isCatchable(l) ? 'missed' : 'avoided' })));
    setPhase('gap');
    setIndex((i) => i + 1);
  };
  const expire = useEffectEvent(() => closeWave(live));

  // Pause, puis la vague s'allume.
  useEffect(() => {
    if (over || phase !== 'gap') return;
    const id = window.setTimeout(() => {
      setLive(wave.lucioles.map((l) => ({ kind: l.kind, cell: l.cell, hopTo: l.hopTo, hopped: false, tapsLeft: l.kind === 'gold' ? 2 : 1, done: null })));
      litAt.current = performance.now();
      setPhase('lit');
    }, wave.gapMs);
    return () => window.clearTimeout(id);
  }, [phase, index, over, wave]);

  // Pendant la vague : les voyageuses sautent à mi-fenêtre, puis tout s'éteint à la fin de la fenêtre.
  useEffect(() => {
    if (over || phase !== 'lit') return;
    const windowMs = slow(config.windowMs);
    const hop = window.setTimeout(() => {
      setLive((current) => current.map((l) => (l.hopTo !== undefined && !l.done && !l.hopped ? { ...l, cell: l.hopTo, hopped: true } : l)));
    }, windowMs / 2);
    const end = window.setTimeout(() => expire(), windowMs);
    return () => {
      window.clearTimeout(hop);
      window.clearTimeout(end);
    };
  }, [phase, index, over, config.windowMs]);

  const tap = (cell: number) => {
    if (over) return;
    const target = phase === 'lit' ? live.findIndex((l) => !l.done && l.cell === cell) : -1;
    if (target < 0) {
      fx.bad();
      showMark('bad', tr('Rien ici', 'Nothing here'));
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }));
      return;
    }
    const luciole = live[target];
    if (luciole.kind === 'red') {
      fx.bad();
      showMark('bad', tr('Pas les rouges !', 'Not the red ones!'));
      setTally((t) => ({ ...t, wrong: t.wrong + 1 }));
      setLive((current) => current.map((l, i) => (i === target ? { ...l, done: 'touched' } : l)));
      return;
    }
    const firstTap = luciole.tapsLeft === (luciole.kind === 'gold' ? 2 : 1);
    const rt = performance.now() - litAt.current;
    if (luciole.tapsLeft > 1) {
      // Premier appui sur une dorée : elle pâlit, il en faut un second.
      fx.tap();
      setTally((t) => ({ ...t, rts: [...t.rts, rt] }));
      setLive((current) => current.map((l, i) => (i === target ? { ...l, tapsLeft: l.tapsLeft - 1 } : l)));
      return;
    }
    fx.good();
    showMark('good');
    showFlash(cell, 'caught');
    setTally((t) => ({ ...t, caught: t.caught + 1, rts: firstTap ? [...t.rts, rt] : t.rts }));
    const next = live.map((l, i): Live => (i === target ? { ...l, tapsLeft: 0, done: 'caught' } : l));
    // Toutes les lucioles à attraper sont prises : la vague s'arrête aussitôt, les rouges s'éteignent.
    if (next.filter(isCatchable).every((l) => l.done)) closeWave(next);
    else setLive(next);
  };

  useKeyDown((e) => {
    if (config.size === 3 && e.key in NUMPAD_3) tap(NUMPAD_3[e.key]);
  }, !over);

  const describe = (cell: number) => {
    const l = phase === 'lit' ? live.find((x) => !x.done && x.cell === cell) : undefined;
    const name = tr(`Case ${cell + 1}`, `Square ${cell + 1}`);
    if (!l) return `${name}, ${tr('vide', 'empty')}`;
    if (l.kind === 'red') return `${name}, ${tr('luciole rouge, à ne pas toucher', 'red firefly, do not tap')}`;
    if (l.kind === 'gold') return `${name}, ${l.tapsLeft > 1 ? tr('luciole dorée, deux appuis', 'gold firefly, two taps') : tr('luciole dorée, encore un appui', 'gold firefly, one more tap')}`;
    return `${name}, ${tr('luciole', 'firefly')}`;
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={LUCIOLES_DURATION_MS} />
      </GameHud>
      <div className="game__stage lucioles">
        <p className="anagram__found">
          <strong>{tally.caught}</strong> / {config.target}
        </p>
        <div className={`lucioles__night lucioles__night--${config.size}`} style={{ gridTemplate: `repeat(${config.size}, minmax(0, 1fr)) / repeat(${config.size}, minmax(0, 1fr))` }}>
          {Array.from({ length: cells }, (_, cell) => {
            const l = phase === 'lit' ? live.find((x) => !x.done && x.cell === cell) : undefined;
            const flashing = flash && flash.cell === cell ? flash : null;
            return (
              <TapButton key={cell} className={`lucioles__cell${l ? ` is-lit is-${l.kind}${l.tapsLeft === 1 && l.kind === 'gold' ? ' is-half' : ''}` : ''}`} onTap={() => tap(cell)} aria-label={describe(cell)}>
                {l && (
                  <span key={`${index}-${l.hopped ? 'h' : 's'}`} className={`lucioles__fly${l.hopped ? ' is-arrived' : ''}`} aria-hidden="true">
                    {l.kind === 'red' && <span className="lucioles__cross" />}
                    {l.kind === 'gold' && <span className="lucioles__two">{l.tapsLeft}</span>}
                  </span>
                )}
                {flashing && <span key={flashing.id} className={`lucioles__flash lucioles__flash--${flashing.kind}`} aria-hidden="true" />}
              </TapButton>
            );
          })}
        </div>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
