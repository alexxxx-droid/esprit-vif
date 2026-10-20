import { DOMAIN_ORDER, DOMAINS } from '../../core/games/registry';
import { tr } from '../../core/lang';
import type { Domain } from '../../core/types';

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = [25, 50, 75, 100];

function point(index: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / DOMAIN_ORDER.length;
  const r = (value / 100) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

/**
 * Carte du cerveau : un radar des 6 domaines (maîtrise, qui monte avec les niveaux réussis : `domainMastery`).
 * Chaque sommet porte son nom et sa valeur ; les barres « Par domaine » donnent les mêmes chiffres.
 */
export function BrainMap({ profile }: { profile: Record<Domain, number | null> }) {
  const values = DOMAIN_ORDER.map((d) => profile[d] ?? 0);
  const shape = values.map((v, i) => point(i, Math.max(v, 3)).join(',')).join(' ');
  const summary = DOMAIN_ORDER.map((d) => `${DOMAINS[d].name} ${profile[d] ?? tr('non joué', 'not played')}`).join(', ');
  return (
    <figure className="brain-map">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={tr(`Carte du cerveau : ${summary}.`, `Brain map: ${summary}.`)}>
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            className="brain-map__ring"
            points={DOMAIN_ORDER.map((_, i) => point(i, ring).join(',')).join(' ')}
          />
        ))}
        {DOMAIN_ORDER.map((d, i) => {
          const [x, y] = point(i, 100);
          return <line key={d} className="brain-map__axis" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
        })}
        <polygon className="brain-map__shape" points={shape} />
        {DOMAIN_ORDER.map((d, i) => {
          const [x, y] = point(i, Math.max(values[i], 3));
          return <circle key={d} className={`brain-map__dot brain-map__dot--${d}`} cx={x} cy={y} r={5.5} />;
        })}
        {DOMAIN_ORDER.map((d, i) => {
          const [x, y] = point(i, 128);
          const anchor = Math.abs(x - CENTER) < 4 ? 'middle' : x < CENTER ? 'end' : 'start';
          return (
            <text key={d} className="brain-map__label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
              <tspan className="brain-map__name">{DOMAINS[d].name}</tspan>
              <tspan className="brain-map__value" x={x} dy="1.25em">
                {profile[d] ?? '—'}
              </tspan>
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
