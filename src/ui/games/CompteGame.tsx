import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { apply, COMPTE_DURATION_MS, compteLevel, generateCompte, scoreCompte, type ComptePuzzle, type Sign } from '../../core/games/compte';
import { createRng, deriveSeed } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

interface Tile {
  id: number;
  value: number;
}

interface Board {
  tiles: Tile[];
  /** Signes déjà joués (niveaux Légende : chaque signe une fois). */
  used: Sign[];
}

interface RoundProps {
  puzzle: ComptePuzzle;
  signs: readonly Sign[];
  once: boolean;
  disabled: boolean;
  onSolved: () => void;
  onRefused: (sign: Sign) => void;
}

/** Un tirage : les plaques, les signes, et l'historique pour annuler. */
function Round({ puzzle, signs, once, disabled, onSolved, onRefused }: RoundProps) {
  const [board, setBoard] = useState<Board>(() => ({ tiles: puzzle.plates.map((value, id) => ({ id, value })), used: [] }));
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [sign, setSign] = useState<Sign | null>(null);
  const nextId = useRef(puzzle.plates.length);

  const tapTile = (id: number) => {
    if (disabled) return;
    fx.tap();
    if (selected === null || selected === id || sign === null) {
      setSelected(selected === id ? null : id);
      setSign(null);
      return;
    }
    const first = board.tiles.find((t) => t.id === selected);
    const second = board.tiles.find((t) => t.id === id);
    if (!first || !second) return;
    const result = apply(first.value, sign, second.value);
    if (result === null) {
      onRefused(sign);
      setSign(null);
      return;
    }
    const tile = { id: nextId.current++, value: result };
    const tiles = board.tiles.flatMap((t) => (t.id === first.id ? [] : t.id === second.id ? [tile] : [t]));
    setHistory([...history, board]);
    setBoard({ tiles, used: once ? [...board.used, sign] : board.used });
    // Le résultat reste choisi : on enchaîne l'opération suivante.
    setSelected(tile.id);
    setSign(null);
    if (result === puzzle.target) onSolved();
  };

  const tapSign = (s: Sign) => {
    if (disabled || selected === null || board.used.includes(s)) return;
    fx.tap();
    setSign(sign === s ? null : s);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (disabled || !previous) return;
    fx.tap();
    setBoard(previous);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setSign(null);
  };

  return (
    <>
      <div className="compte__target" aria-label={tr(`Nombre cible : ${puzzle.target}`, `Target number: ${puzzle.target}`)}>
        <span className="compte__target-label">{tr('Cible', 'Target')}</span>
        <strong>{puzzle.target}</strong>
      </div>
      <div className="compte__tiles" role="group" aria-label={tr('Les plaques', 'The tiles')}>
        {board.tiles.map((t) => (
          <TapButton
            key={t.id}
            className={`compte__tile${t.id === selected ? ' is-selected' : ''}${t.id >= puzzle.plates.length ? ' is-result' : ''}`}
            onTap={() => tapTile(t.id)}
            aria-pressed={t.id === selected}
            disabled={disabled}
          >
            {t.value}
          </TapButton>
        ))}
      </div>
      <div className="compte__signs" role="group" aria-label={tr('Les signes', 'The signs')}>
        {signs.map((s) => (
          <TapButton
            key={s}
            className={`compte__sign${s === sign ? ' is-active' : ''}${board.used.includes(s) ? ' is-used' : ''}`}
            onTap={() => tapSign(s)}
            aria-pressed={s === sign}
            disabled={disabled || selected === null || board.used.includes(s)}
          >
            {s}
          </TapButton>
        ))}
      </div>
      <div className="compte__actions">
        <TapButton className="btn btn--ghost btn--sm" onTap={undo} disabled={disabled || history.length === 0}>
          <Icon name="replay" size={18} /> {tr('Annuler', 'Undo')}
        </TapButton>
      </div>
    </>
  );
}

export function CompteGame({ seed, level, onFinish }: GameProps) {
  const config = compteLevel(level);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const puzzle = useMemo(() => generateCompte(createRng(deriveSeed(seed, index)), level), [seed, index, level]);

  const finish = useEffectEvent(() => {
    setOver(true);
    onFinish({
      score: scoreCompte(solved, level),
      stats: { solved, skipped },
      headline: tr(byCount(solved, `${solved} compte trouvé`, `${solved} comptes trouvés`), plural(solved, 'target hit', 'targets hit')),
      lines: [
        { label: tr('Comptes trouvés', 'Targets hit'), value: String(solved) },
        { label: tr('Tirages passés', 'Rounds skipped'), value: skipped ? String(skipped) : tr('Aucun', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(config.target) },
      ],
    });
  });

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= COMPTE_DURATION_MS) {
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

  const solve = () => {
    fx.good();
    showMark('good');
    setSolved(solved + 1);
    setIndex(index + 1);
  };

  const refuse = (sign: Sign) => {
    fx.bad();
    showMark('bad', sign === '÷' ? tr('La division ne tombe pas juste', 'That division isn’t even') : tr('Pas de nombre nul ou négatif', 'No zero or negative numbers'));
  };

  const skip = () => {
    if (over) return;
    fx.tap();
    setSkipped(skipped + 1);
    setIndex(index + 1);
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={COMPTE_DURATION_MS} />
      </GameHud>
      <div className="game__stage compte">
        <p className="anagram__found">
          <strong>{solved}</strong> / {config.target}
        </p>
        <Round key={index} puzzle={puzzle} signs={config.signs} once={config.once} disabled={over} onSolved={solve} onRefused={refuse} />
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls compte__controls">
        <TapButton className="btn btn--ghost" onTap={skip} disabled={over}>
          {tr('Passer ce tirage', 'Skip this round')}
        </TapButton>
      </div>
    </div>
  );
}
