import type { ReactNode } from 'react';
import type { Mood } from '../mascot-mood';

/*
 * Vif, la mascotte maison : une boule ronde coiffée de quatre pointes d'étincelle (le symbole de l'appli).
 * Dessin original ; ses humeurs changent les yeux, la bouche et les bras.
 */

const MOUTHS: Record<Mood, ReactNode> = {
  hello: <path className="vif__line" d="M51 75q9 8 18 0" />,
  happy: <path className="vif__line" d="M50 74q10 10 20 0" />,
  cheer: (
    <>
      <path className="vif__mouth" d="M48 72q12 18 24 0z" />
      <path className="vif__tongue" d="M54 78.5q6 5 12 0q-6 -3.5 -12 0z" />
    </>
  ),
  think: <path className="vif__line" d="M54 78q6 -3 12 0" />,
  sleep: <ellipse className="vif__mouth" cx="60" cy="78" rx="3.2" ry="2.6" />,
  wow: <ellipse className="vif__mouth" cx="60" cy="78" rx="5" ry="6" />,
  gentle: <path className="vif__line" d="M52 77q8 4 16 0" />,
};

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'sleep') {
    return <path className="vif__line" d="M41 60q6 5 12 0M67 60q6 5 12 0" />;
  }
  if (mood === 'cheer') {
    return <path className="vif__line vif__line--thick" d="M41 62q6 -8 12 0M67 62q6 -8 12 0" />;
  }
  // Le regard : vers le haut quand Vif réfléchit, droit devant sinon.
  const look = mood === 'think' ? { x: 2, y: -3 } : { x: 0, y: 1 };
  const big = mood === 'wow' ? 1.15 : 1;
  return (
    <g className="vif__eyes">
      <ellipse className="vif__white" cx="47" cy="59" rx={7 * big} ry={9 * big} />
      <ellipse className="vif__white" cx="73" cy="59" rx={7 * big} ry={9 * big} />
      <circle className="vif__pupil" cx={47 + look.x} cy={60 + look.y} r="4.3" />
      <circle className="vif__pupil" cx={73 + look.x} cy={60 + look.y} r="4.3" />
      <circle className="vif__shine" cx={48.6 + look.x} cy={57.6 + look.y} r="1.5" />
      <circle className="vif__shine" cx={74.6 + look.x} cy={57.6 + look.y} r="1.5" />
    </g>
  );
}

function Arms({ mood }: { mood: Mood }) {
  if (mood === 'cheer') return <path className="vif__arm" d="M27 62q-11 -8 -11 -22M93 62q11 -8 11 -22" />;
  if (mood === 'hello') return <path className="vif__arm vif__arm--wave" d="M93 66q12 -6 13 -20" />;
  return null;
}

/** Vif, dans l'humeur demandée. Décoratif : le texte voisin dit toujours l'essentiel. */
export function Mascot({ mood = 'happy', size = 64, className }: { mood?: Mood; size?: number; className?: string }) {
  return (
    <svg className={`vif vif--${mood}${className ? ` ${className}` : ''}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <g className="vif__bob">
        {/* Les quatre pointes d'étincelle, derrière la tête. */}
        <path className="vif__spark" d="M60 4c4 14 8 22 14 26-8 2-20 2-28 0 6-4 10-12 14-26zM60 116c4-12 8-20 14-24-8-2-20-2-28 0 6 4 10 12 14 24zM6 62c14-4 22-8 26-14 2 8 2 20 0 28-4-6-12-10-26-14zM114 62c-14-4-22-8-26-14-2 8-2 20 0 28 4-6 12-10 26-14z" />
        <circle className="vif__body" cx="60" cy="62" r="36" />
        <ellipse className="vif__glow" cx="48" cy="44" rx="14" ry="9" />
        <ellipse className="vif__cheek" cx="37" cy="72" rx="6" ry="3.6" />
        <ellipse className="vif__cheek" cx="83" cy="72" rx="6" ry="3.6" />
        <Eyes mood={mood} />
        {MOUTHS[mood]}
        <Arms mood={mood} />
        {mood === 'sleep' && (
          <text className="vif__z" x="92" y="32">
            z
          </text>
        )}
        {mood === 'think' && <path className="vif__dots" d="M96 30h.1M103 22h.1M110 14h.1" />}
      </g>
    </svg>
  );
}
