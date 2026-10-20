import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { generatePaires, PAIRES_PEEK_MS, pairesLevel, scorePaires, swapSlots, type PairFace } from '../../core/games/paires';
import { describeShape } from '../../core/games/shapes';
import { byCount, plural } from '../../core/format';
import { tr } from '../../core/lang';
import { createRng } from '../../core/rng';
import { Shape } from '../components/Shape';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { useReducedMotion } from '../hooks';
import { slow } from '../tempo';

const PAIR_COLORS = ['var(--d-calcul)', 'var(--d-memoire)', 'var(--d-attention)', 'var(--d-vitesse)', 'var(--d-langage)', 'var(--d-logique)'];

function faceColor(face: PairFace, similar: boolean): string {
  return similar ? 'var(--ink)' : PAIR_COLORS[face.color];
}

/** « étoile creuse » (« hollow star ») : l'ordre des mots suit la langue. */
const describeFace = (face: PairFace) => describeShape({ shape: face.shape, filled: face.filled, rotation: 0 });

interface PairCardProps {
  face: PairFace;
  up: boolean;
  found: boolean;
  color: string;
  label: string;
  onTap?: () => void;
  /** Identité de la carte, pour la suivre quand elle change de place. */
  cardId?: number;
  /** La carte vient d'échanger sa place (cartes baladeuses). */
  swapped?: boolean;
}

/** Une carte retournable : dos commun, face = une forme. */
export function PairCard({ face, up, found, color, label, onTap, cardId, swapped }: PairCardProps) {
  return (
    <TapButton
      className={`paire${up || found ? ' is-up' : ''}${found ? ' is-found' : ''}${swapped ? ' is-swapped' : ''}`}
      onTap={onTap ?? (() => {})}
      aria-label={label}
      disabled={found}
      data-card={cardId}
    >
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
  // Place de chaque carte dans la grille : elles bougent aux niveaux « cartes baladeuses ».
  const [slots, setSlots] = useState<number[]>(() => deck.cards.map((_, card) => card));
  const [swapped, setSwapped] = useState<readonly number[]>([]);
  const pendingSwap = useRef<readonly [number, number] | null>(null);
  const slideFrom = useRef<Map<number, DOMRect> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const hideTimer = useRef(0);
  const pairsFound = found.size / 2;
  // Jamais plus long que 0,9 s, même en « temps généreux » : c'est la durée des niveaux 1 à 20.
  const peekMs = Math.min(PAIRES_PEEK_MS, slow(config.peekMs));

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
      headline: tr(`${foundPairs}/${config.pairs} paires · ${tries} coups`, `${foundPairs}/${config.pairs} pairs · ${plural(tries, 'move')}`),
      lines: [
        { label: tr('Paires trouvées', 'Pairs found'), value: `${foundPairs} / ${config.pairs}` },
        { label: tr('Coups joués', 'Moves'), value: String(tries) },
        { label: tr('Coups minimum', 'Fewest possible moves'), value: String(config.pairs) },
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

  // Cartes baladeuses : les deux cartes ratées glissent l'une vers la place de l'autre.
  const swapPending = () => {
    const pair = pendingSwap.current;
    pendingSwap.current = null;
    if (!pair) return;
    const grid = gridRef.current;
    if (grid && !reduced) {
      const rects = new Map<number, DOMRect>();
      for (const card of pair) {
        const el = grid.querySelector<HTMLElement>(`[data-card="${card}"]`);
        if (el) rects.set(card, el.getBoundingClientRect());
      }
      slideFrom.current = rects;
    }
    setSlots((current) => swapSlots(current, current.indexOf(pair[0]), current.indexOf(pair[1])));
    setSwapped(pair);
  };

  useLayoutEffect(() => {
    const from = slideFrom.current;
    slideFrom.current = null;
    const grid = gridRef.current;
    if (!from || !grid) return;
    for (const [card, rect] of from) {
      const el = grid.querySelector<HTMLElement>(`[data-card="${card}"]`);
      if (!el?.animate) continue;
      const now = el.getBoundingClientRect();
      el.animate([{ transform: `translate(${rect.left - now.left}px, ${rect.top - now.top}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 450,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      });
    }
  }, [slots]);

  useEffect(() => {
    if (swapped.length === 0) return;
    const id = window.setTimeout(() => setSwapped([]), 900);
    return () => window.clearTimeout(id);
  }, [swapped]);

  const flip = (card: number) => {
    if (over || preview || found.has(card) || up.includes(card)) return;
    window.clearTimeout(hideTimer.current);
    // Deux cartes déjà visibles et différentes : on les recache aussitôt pour jouer sans attendre.
    if (up.length >= 2) swapPending();
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
      if (config.swap) pendingSwap.current = [next[0], next[1]];
      hideTimer.current = window.setTimeout(() => {
        setUp([]);
        swapPending();
      }, peekMs);
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
            tr('Mémorise les cartes…', 'Memorize the cards…')
          ) : (
            <>
              <strong>{pairsFound}</strong>{' '}
              {tr(
                byCount(attempts, `/ ${config.pairs} paires · ${attempts} coup`, `/ ${config.pairs} paires · ${attempts} coups`),
                byCount(attempts, `/ ${config.pairs} pairs · ${attempts} move`, `/ ${config.pairs} pairs · ${attempts} moves`),
              )}
            </>
          )}
        </p>
        <div ref={gridRef} className={`paires${config.cols > 4 ? ' paires--dense' : ''}`} style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
          {slots.map((card) => {
            const face = deck.faces[deck.cards[card]];
            const visible = preview || up.includes(card);
            const isFound = found.has(card);
            return (
              <PairCard
                key={card}
                face={face}
                up={visible}
                found={isFound}
                color={faceColor(face, config.similar)}
                label={
                  isFound
                    ? tr(`Carte ${card + 1} : ${describeFace(face)}, trouvée`, `Card ${card + 1}: ${describeFace(face)}, found`)
                    : visible
                      ? tr(`Carte ${card + 1} : ${describeFace(face)}`, `Card ${card + 1}: ${describeFace(face)}`)
                      : tr(`Carte ${card + 1}, cachée`, `Card ${card + 1}, face down`)
                }
                onTap={() => flip(card)}
                cardId={card}
                swapped={swapped.includes(card)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
