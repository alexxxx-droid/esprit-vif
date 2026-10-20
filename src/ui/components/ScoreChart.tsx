import { useState, type PointerEvent } from 'react';
import { formatLongDay, formatShortDay } from '../../core/format';
import { tr } from '../../core/lang';

export interface ScorePoint {
  day: string;
  score: number;
  level: number;
}

const W = 340;
const H = 180;
const M = { top: 14, right: 14, bottom: 28, left: 30 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const TICKS = [0, 50, 100];

/**
 * Tous les scores d'un jeu, dans l'ordre où ils ont été joués (100 en haut). Toucher la courbe
 * montre une partie ; le résumé lu par les lecteurs d'écran donne le premier et le dernier score.
 */
export function ScoreChart({ points }: { points: ScorePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => M.left + (n === 1 ? PW / 2 : (i * PW) / (n - 1));
  const y = (score: number) => M.top + (1 - score / 100) * PH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const best = Math.max(...points.map((p) => p.score));

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = n === 1 ? 0 : Math.round(((px - M.left) / PW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  const shown = active === null ? null : points[active];
  const first = points[0];
  const last = points[n - 1];
  return (
    <div className="chart">
      <div
        className="chart__plot"
        role="img"
        aria-label={tr(
          `${n} parties, de ${first.score} points le ${formatLongDay(first.day)} à ${last.score} points le ${formatLongDay(last.day)} ; record ${best}.`,
          `${n} games, from ${first.score} points on ${formatLongDay(first.day)} to ${last.score} points on ${formatLongDay(last.day)}; best ${best}.`,
        )}
      >
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
          {TICKS.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={M.left - 6} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {n > 1 && <path className="chart__line" d={line} />}
          {points.map((p, i) => (
            <circle key={i} className={`chart__dot${p.score === best ? ' chart__dot--best' : ''}`} cx={x(i)} cy={y(p.score)} r={i === active ? 5.5 : n > 40 ? 2 : 3.2} />
          ))}
          {active !== null && <line className="chart__cross" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + PH} />}
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
          <div className="chart__tooltip" style={{ left: `${Math.min(82, Math.max(18, (x(active) / W) * 100))}%`, top: `${(y(shown.score) / H) * 100}%` }}>
            <strong>{tr(`${shown.score} pts`, `${shown.score} pts`)}</strong>
            <span className="chart__tooltip-day">
              {formatShortDay(shown.day)} · {tr(`niv. ${shown.level}`, `lv. ${shown.level}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
