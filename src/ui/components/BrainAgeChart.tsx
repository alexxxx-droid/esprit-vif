import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatLongDay, formatShortDay } from '../../core/format';
import { MAX_BRAIN_AGE, MIN_BRAIN_AGE } from '../../core/scoring';

export interface AgePoint {
  day: string;
  age: number;
}

const W = 340;
const H = 200;
const M = { top: 16, right: 50, bottom: 30, left: 34 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const TICKS = [20, 40, 60, 80];

/**
 * Courbe de l'âge cérébral. L'axe est inversé (20 ans en haut) : progresser, c'est monter.
 * Survol, toucher ou flèches du clavier affichent la valeur d'un test ; un tableau donne toutes les valeurs.
 */
export function BrainAgeChart({ points }: { points: AgePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const id = useId();
  const n = points.length;
  const x = (i: number) => M.left + (n === 1 ? PW / 2 : (i * PW) / (n - 1));
  const y = (age: number) => M.top + ((age - MIN_BRAIN_AGE) / (MAX_BRAIN_AGE - MIN_BRAIN_AGE)) * PH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.age).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${M.top + PH} L${x(0).toFixed(1)},${M.top + PH} Z`;
  const last = points[n - 1];

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = n === 1 ? 0 : Math.round(((px - M.left) / PW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const from = active ?? n - 1;
      setActive(Math.max(0, Math.min(n - 1, from + (event.key === 'ArrowLeft' ? -1 : 1))));
    } else if (event.key === 'Escape') setActive(null);
  };

  const shown = active === null ? null : points[active];
  const first = points[0];
  const summary =
    n === 1
      ? `Un test : ${first.age} ans.`
      : `${n} tests, de ${first.age} ans le ${formatLongDay(first.day)} à ${last.age} ans le ${formatLongDay(last.day)}.`;

  return (
    <div className="chart">
      <div
        className="chart__plot"
        tabIndex={0}
        role="group"
        aria-label={`Courbe de l’âge cérébral. ${summary} Flèches gauche et droite pour parcourir les tests.`}
        aria-describedby={`${id}-table`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        >
          {TICKS.map((age) => (
            <g key={age}>
              <line className="chart__grid" x1={M.left} x2={W - M.right} y1={y(age)} y2={y(age)} />
              <text className="chart__tick" x={M.left - 8} y={y(age) + 4} textAnchor="end">
                {age}
              </text>
            </g>
          ))}
          {n > 1 && <path className="chart__area" d={area} />}
          {n > 1 && <path className="chart__line" d={line} />}
          {shown && active !== null && (
            <line className="chart__cross" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + PH} />
          )}
          {points.map((p, i) =>
            i === n - 1 || i === active ? (
              <circle key={i} className="chart__dot" cx={x(i)} cy={y(p.age)} r={5.5} />
            ) : null,
          )}
          <text className="chart__end" x={x(n - 1) + 11} y={y(last.age) + 4}>
            {last.age} ans
          </text>
          <text className="chart__tick" x={x(0)} y={H - 8} textAnchor={n === 1 ? 'middle' : 'start'}>
            {formatShortDay(first.day)}
          </text>
          {n > 1 && (
            <text className="chart__tick" x={x(n - 1)} y={H - 8} textAnchor="end">
              {formatShortDay(last.day)}
            </text>
          )}
        </svg>
        {shown && active !== null && (
          <div
            className="chart__tooltip"
            style={{
              left: `${Math.min(82, Math.max(18, (x(active) / W) * 100))}%`,
              top: `${(y(shown.age) / H) * 100}%`,
            }}
          >
            <span className="chart__tooltip-day">{formatShortDay(shown.day)}</span>
            <strong>{shown.age} ans</strong>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown ? `${formatLongDay(shown.day)} : ${shown.age} ans` : ''}
      </p>
      <details className="chart__table" id={`${id}-table`}>
        <summary>Voir les valeurs</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Test du jour</th>
              <th scope="col">Âge cérébral</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.day}>
                <td>{formatLongDay(p.day)}</td>
                <td>{p.age} ans</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
