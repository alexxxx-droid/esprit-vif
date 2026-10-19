import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from 'react';
import { generatePaires, pairesLevel, scorePaires, type PairFace } from '../../core/games/paires';
import { fillWord, SHAPE_NAMES } from '../../core/games/shapes';
import { createRng } from '../../core/rng';
import { Shape } from '../components/Shape';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';

const PAIR_COLORS = ['var(--d-calcul)', 'var(--d-memoire)', 'var(--d-attention)', 'var(--d-vitesse)', 'var(--d-langage)', 'var(--d-logique)'];

function faceColor(face: PairFace, similar: boolean): string {
  return similar ? 'var(--ink)' : PAIR_COLORS[face.color];
}

const describeFace = (face: PairFace) => `${SHAPE_NAMES[face.shape]} ${fillWord(face.shape, face.filled)}`;

/** Une carte retournable : dos commun, face = une forme. */
export function PairCard({ face, up, found, color, label, onTap }: { face: PairFace; up: boolean; found: boolean; color: string; label: string; onTap?: () => void }) {
  return (
    <TapButton className={`paire${up || found ? ' is-up' : ''}${found ? ' is-found' : ''}`} onTap={onTap ?? (() => {})} aria-label={label} disabled={found}>
      <span className="paire__inner">
        <span className="paire__back" aria-hidden="true" />
        <span className="paire__front" style={{ color } as CSSProperties} aria-hidden="true">
          <Shape card={{ shape: face.shape, filled: face.filled, rotation: 0 }} size={64} />
        </span>
      </span>
    </TapButton>
  );
}

export function PairesGame({ seed, level, onFinish }: GameProps) {
  const config = pairesLevel(level);
  const deck = useMemo(() => generatePaires(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [preview, setPreview] = useState(config.previewMs > 0);
  const [up, setUp] = useState<number[]>([]);
  const [found, setFound] = useState<ReadonlySet<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [over, setOver] = useState(false);
  const hideTimer = useRef(0);
  const pairsFound = found.size / 2;

  const finish = useEffectEvent(() => {
    if (over) return;
    const foundPairs = found.size / 2;
    const tries = attempts;
    setOver(true);
    clock.stop();
    const seconds = Math.round(clock.elapsed() / 1000);
    onFinish({
      score: scorePaires(foundPairs, tries, level),
      stats: { found: foundPairs, attempts: tries, seconds },
      headline: `${foundPairs}/${config.pairs} paires · ${tries} coups`,
      lines: [
        { label: 'Paires trouvées', value: `${foundPairs} / ${config.pairs}` },
        { label: 'Coups joués', value: String(tries) },
        { label: 'Coups minimum', value: String(config.pairs) },
      ],
    });
  });

  // Aperçu : toutes les cartes face visible, puis le chrono démarre.
  useEffect(() => {
    if (!preview) return;
    const id = window.setTimeout(() => setPreview(false), config.previewMs);
    return () => window.clearTimeout(id);
  }, [preview, config.previewMs]);

  useEffect(() => {
    if (preview) return;
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= config.durationMs) {
        window.clearInterval(id);
        finish();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hideTimer.current);
    };
  }, [preview, clock, config.durationMs]);

  // Toutes les paires trouvées : un instant pour voir la dernière, puis le résultat.
  const allFound = found.size === deck.cards.length;
  useEffect(() => {
    if (!allFound) return;
    const id = window.setTimeout(() => finish(), 500);
    return () => window.clearTimeout(id);
  }, [allFound]);

  const flip = (card: number) => {
    if (over || preview || found.has(card) || up.includes(card)) return;
    window.clearTimeout(hideTimer.current);
    // Deux cartes déjà visibles et différentes : on les recache aussitôt pour jouer sans attendre.
    const current = up.length >= 2 ? [] : up;
    const next = [...current, card];
    if (next.length < 2) {
      fx.tap();
      setUp(next);
      return;
    }
    const tries = attempts + 1;
    setAttempts(tries);
    if (deck.cards[next[0]] === deck.cards[next[1]]) {
      fx.good();
      setFound(new Set([...found, ...next]));
      setUp([]);
    } else {
      fx.tap();
      setUp(next);
      hideTimer.current = window.setTimeout(() => setUp([]), 900);
    }
  };

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={config.durationMs} />
      </GameHud>
      <div className="game__stage paires-stage">
        <p className="anagram__found" aria-live="polite">
          {preview ? (
            'Mémorise les cartes…'
          ) : (
            <>
              <strong>{pairsFound}</strong> / {config.pairs} paires · {attempts} coup{attempts > 1 ? 's' : ''}
            </>
          )}
        </p>
        <div className="paires" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
          {deck.cards.map((faceIndex, card) => {
            const face = deck.faces[faceIndex];
            const visible = preview || up.includes(card);
            const isFound = found.has(card);
            return (
              <PairCard
                key={card}
                face={face}
                up={visible}
                found={isFound}
                color={faceColor(face, config.similar)}
                label={isFound ? `Carte ${card + 1} : ${describeFace(face)}, trouvée` : visible ? `Carte ${card + 1} : ${describeFace(face)}` : `Carte ${card + 1}, cachée`}
                onTap={() => flip(card)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
