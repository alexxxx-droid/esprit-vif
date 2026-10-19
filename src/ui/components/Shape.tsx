import type { ShapeCard, ShapeKind } from '../../core/games/shapes';

const PATHS: Record<ShapeKind, string> = {
  circle: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z',
  square: 'M4 4h16v16H4z',
  triangle: 'M12 3l9.5 17h-19z',
  star: 'M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z',
  diamond: 'M12 2.5l9 9.5-9 9.5-9-9.5z',
  cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  hexagon: 'M7 3.5h10l5 8.5-5 8.5H7l-5-8.5z',
  octagon: 'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z',
  pentagon: 'M12 2.8l9.2 6.7-3.5 10.8H6.3L2.8 9.5z',
  heart: 'M12 20.5s-8.5-5.3-8.5-11a4.6 4.6 0 0 1 8.5-2.4 4.6 4.6 0 0 1 8.5 2.4c0 5.7-8.5 11-8.5 11z',
  moon: 'M15.5 3a9 9 0 1 0 5.5 15.3A7.5 7.5 0 0 1 15.5 3z',
  flag: 'M3 9.5h9.5V5l8.5 7-8.5 7v-4.5H6v3H3z',
};

/** Forme dessinée, pleine ou creuse : la différence se voit à la forme et au remplissage, jamais à la seule couleur. */
export function Shape({ card, size = 96, className }: { card: ShapeCard; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={card.rotation ? { transform: `rotate(${card.rotation}deg)` } : undefined}
    >
      <path
        d={PATHS[card.shape]}
        fill={card.filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={card.filled ? 0 : 2.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** La même forme, pleine, à placer dans un dessin SVG plus grand (plateaux de la balance…). */
export function ShapeGlyph({ shape, x, y, size, color }: { shape: ShapeKind; x: number; y: number; size: number; color: string }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" overflow="visible">
      <path d={PATHS[shape]} fill={color} />
    </svg>
  );
}
