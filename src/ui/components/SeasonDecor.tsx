import type { CSSProperties, ReactNode } from 'react';
import type { ResolvedTheme } from '../../core/themes';
import { useReducedMotion } from '../hooks';

type Decor = NonNullable<ResolvedTheme['decor']>;

/** Combien de flocons, pétales ou feuilles à la fois : assez pour l'ambiance, pas pour distraire. */
const COUNT = 14;

const SHAPES: Record<Decor, (i: number) => ReactNode> = {
  hiver: () => <circle cx="6" cy="6" r="4.2" fill="#ffffff" />,
  printemps: (i) => <ellipse cx="6" cy="6" rx="5.6" ry="3.4" fill={i % 3 ? '#ffb3cf' : '#fff0f6'} />,
  sakura: (i) => <path d="M6 1c3 2 4 5 0 10-4-5-3-8 0-10z" fill={i % 3 ? '#ffb3cf' : '#ffd6e5'} />,
  automne: (i) => <path d="M6 0c4 3 5 7 1 12C2 8 2 4 6 0z" fill={['#e8742c', '#c9471c', '#f2b13a', '#a8551d'][i % 4]} />,
  ete: () => <circle cx="6" cy="6" r="3" fill="#ffe082" />,
};

/**
 * Le décor de la saison derrière les écrans à onglets : neige l'hiver, pétales au printemps,
 * lucioles l'été, feuilles à l'automne. Les positions sont réparties régulièrement (angle d'or),
 * donc identiques d'une visite à l'autre. Rien du tout quand on demande moins d'animations.
 */
export function SeasonDecor({ decor }: { decor: Decor }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const shape = SHAPES[decor];
  return (
    <div className={`season-decor season-decor--${decor}`} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const style = {
          '--x': `${((i * 61.8) % 100).toFixed(1)}%`,
          '--d': `${(i * 1.37) % 12}s`,
          '--t': `${11 + ((i * 7) % 9)}s`,
          '--s': `${0.7 + ((i * 3) % 5) * 0.15}`,
          '--sway': `${(i % 2 ? 1 : -1) * (12 + ((i * 5) % 18))}px`,
        } as CSSProperties;
        return (
          <svg key={i} className="season-decor__bit" style={style} width="12" height="12" viewBox="0 0 12 12">
            {shape(i)}
          </svg>
        );
      })}
    </div>
  );
}
