import { useState, type ReactNode } from 'react';
import type { CharacterId } from '../../core/characters';
import type { WornHat } from '../../core/wardrobe';
import type { AuraId } from '../../core/progression';
import { useActiveAura, useActiveCharacter, useActiveHat } from '../characters-context';
import { fx } from '../fx/fx';
import type { SeasonId } from '../../core/events';
import type { Mood } from '../mascot-mood';
import { useSeason } from '../season';
import { renderHat } from './hats';

/*
 * Vif, la mascotte maison (une boule coiffée de quatre pointes d'étincelle, le symbole de l'appli),
 * et sa bande de fruits. Dessins originaux : tous partagent le même visage, dont les humeurs
 * changent les yeux, la bouche et les bras.
 */

/** Ce qu'il y a derrière et autour du visage : la silhouette de chaque compagnon. */
/** Les pointes d'étincelle de Vif : celle du haut s'efface sous un chapeau. */
const SPARK_TOP = 'M60 4c4 14 8 22 14 26-8 2-20 2-28 0 6-4 10-12 14-26z';
const SPARK_OTHERS =
  'M60 116c4-12 8-20 14-24-8-2-20-2-28 0 6 4 10 12 14 24zM6 62c14-4 22-8 26-14 2 8 2 20 0 28-4-6-12-10-26-14zM114 62c-14-4-22-8-26-14-2 8-2 20 0 28 4-6 12-10 26-14z';

const vifBody = (hatted: boolean) => (
  <>
    <path className="vif__spark" d={hatted ? SPARK_OTHERS : SPARK_TOP + SPARK_OTHERS} />
    <circle className="vif__body" cx="60" cy="62" r="36" />
  </>
);

const BODIES: Record<CharacterId, ReactNode> = {
  vif: vifBody(false),
  pomme: (
    <>
      <path className="vif__body" d="M60 34C46 22 20 28 22 60c2 34 24 46 38 40 14 6 36-6 38-40 2-32-24-38-38-26z" />
      <path className="vif__stem" d="M60 36c-1-8 1-14 5-20" />
      <path className="vif__leaf" d="M64 22c8-10 20-10 26-4-8 8-18 9-26 4z" />
    </>
  ),
  orange: (
    <>
      <circle className="vif__body" cx="60" cy="63" r="38" />
      <path className="vif__dimples" d="M36 42h.1M30 56h.1M86 44h.1M92 58h.1M40 92h.1M80 94h.1M60 100h.1M70 34h.1" />
      <path className="vif__leaf" d="M60 26c4-9 14-13 22-10-4 9-13 13-22 10z" />
      <circle className="vif__nub" cx="59" cy="26" r="3.4" />
    </>
  ),
  citron: (
    <>
      <path className="vif__body" d="M8 62c4-4 4-6 8-8 6-16 24-26 44-26s38 10 44 26c4 2 4 4 8 8-4 4-4 6-8 8-6 16-24 26-44 26S22 86 16 70c-4-2-4-4-8-8z" />
      <path className="vif__leaf" d="M60 29c2-10 12-16 22-15-3 10-12 16-22 15z" />
    </>
  ),
  fraise: (
    <>
      <path className="vif__body" d="M60 108C30 98 20 72 24 54c4-18 20-22 36-18 16-4 32 0 36 18 4 18-6 44-36 54z" />
      <path className="vif__seeds" d="M32 58l1 3M88 58l-1 3M36 84l1 3M84 84l-1 3M48 96l1 3M72 96l-1 3M60 100v3M28 70l1 3M92 70l-1 3" />
      <path className="vif__leaf" d="M60 38c-6-4-18-6-26-2 6 6 16 8 26 6 10 2 20 0 26-6-8-4-20-2-26 2zM60 40c-2-8 0-14 4-20" />
    </>
  ),
  raisin: (
    <>
      <circle className="vif__body-dark" cx="34" cy="36" r="14" />
      <circle className="vif__body-dark" cx="60" cy="28" r="14" />
      <circle className="vif__body-dark" cx="86" cy="36" r="14" />
      <circle className="vif__body" cx="60" cy="66" r="36" />
      <path className="vif__stem" d="M60 16c0-6 2-10 6-12" />
      <path className="vif__leaf" d="M64 8c8-6 18-4 22 2-8 4-16 4-22-2z" />
    </>
  ),
  poire: (
    <>
      <path className="vif__body" d="M60 20c10 0 14 10 16 20 16 10 24 30 18 48-6 14-20 18-34 18s-28-4-34-18c-6-18 2-38 18-48 2-10 6-20 16-20z" />
      <path className="vif__stem" d="M60 22c0-8 2-12 6-16" />
      <path className="vif__leaf" d="M64 12c8-6 18-4 22 2-8 4-16 4-22-2z" />
    </>
  ),
  kiwi: (
    <>
      <circle cx="60" cy="63" r="40" fill="#7a5230" />
      <circle className="vif__body" cx="60" cy="63" r="35" />
      <path
        className="vif__kiwi-seeds"
        d="M60 32v.1M76 37v.1M87 49v.1M91 64v.1M86 80v.1M74 91v.1M46 91v.1M34 80v.1M29 64v.1M33 49v.1M44 37v.1"
      />
    </>
  ),
  ananas: (
    <>
      <path className="vif__leaf" d="M60 30c-4-10-2-20 0-26 2 6 4 16 0 26zM58 31c-8-6-14-14-14-22 6 4 12 12 14 22zM62 31c8-6 14-14 14-22-6 4-12 12-14 22z" />
      <ellipse className="vif__body" cx="60" cy="68" rx="34" ry="40" />
      <path className="vif__ananas-grid" d="M34 46l52 52M30 62l38 38M42 36l46 46M86 46l-52 52M90 62l-38 38M78 36l-46 46" />
    </>
  ),
  myrtille: (
    <>
      <circle className="vif__body" cx="60" cy="64" r="38" />
      <path className="vif__myrtille-crown" d="M60 22l4 6 7-2-3 6 6 4-7 2v7l-7-4-7 4v-7l-7-2 6-4-3-6 7 2z" />
      <ellipse className="vif__bloom" cx="80" cy="44" rx="9" ry="5" />
    </>
  ),
  pasteque: (
    <>
      <circle className="vif__body" cx="60" cy="63" r="38" />
      <path className="vif__stripes" d="M60 25c-10 10-14 24-14 38s4 28 14 38M60 25c10 10 14 24 14 38s-4 28-14 38M36 32c-8 10-12 20-12 31s4 21 12 31M84 32c8 10 12 20 12 31s-4 21-12 31" />
      <circle className="vif__nub vif__nub--green" cx="60" cy="25" r="3.4" />
    </>
  ),
};

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
  point: <path className="vif__line" d="M50 74q10 10 20 0" />,
};

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'sleep') {
    return <path className="vif__line" d="M41 60q6 5 12 0M67 60q6 5 12 0" />;
  }
  if (mood === 'cheer') {
    return <path className="vif__line vif__line--thick" d="M41 62q6 -8 12 0M67 62q6 -8 12 0" />;
  }
  // Le regard : vers le haut quand Vif réfléchit, vers ce qu'il montre, droit devant sinon.
  const look = mood === 'think' ? { x: 2, y: -3 } : mood === 'point' ? { x: -2.6, y: 2.6 } : { x: 0, y: 1 };
  const big = mood === 'wow' ? 1.15 : 1;
  return (
    <g className="vif__eyes">
      <ellipse className="vif__white" cx="47" cy="59" rx={7 * big} ry={9 * big} />
      <ellipse className="vif__white" cx="73" cy="59" rx={7 * big} ry={9 * big} />
      {/* Le regard se promène de temps en temps, à gauche puis à droite. */}
      <g className="vif__look">
        <circle className="vif__pupil" cx={47 + look.x} cy={60 + look.y} r="4.3" />
        <circle className="vif__pupil" cx={73 + look.x} cy={60 + look.y} r="4.3" />
        <circle className="vif__shine" cx={48.6 + look.x} cy={57.6 + look.y} r="1.5" />
        <circle className="vif__shine" cx={74.6 + look.x} cy={57.6 + look.y} r="1.5" />
      </g>
    </g>
  );
}

function Arms({ mood }: { mood: Mood }) {
  if (mood === 'cheer') return <path className="vif__arm" d="M27 62q-11 -8 -11 -22M93 62q11 -8 11 -22" />;
  if (mood === 'hello') return <path className="vif__arm vif__arm--wave" d="M93 66q12 -6 13 -20" />;
  if (mood === 'point') return <path className="vif__arm vif__arm--point" d="M29 70q-11 5 -19 15" />;
  return null;
}

/** Les accessoires de saison, posés sur la tête (ou sur les yeux, l'été). */
const ACCESSORIES: Record<SeasonId, ReactNode> = {
  halloween: (
    <g className="acc acc--halloween">
      <path className="acc__hat" d="M30 34c8-3 20-4 30-4s22 1 30 4c4 2 2 5-4 6-8 1-17 2-26 2s-18-1-26-2c-6-1-8-4-4-6z" />
      <path className="acc__hat" d="M44 33c2-10 6-20 14-28 4-4 10-2 12 2-6 2-8 8-6 26z" />
      <path className="acc__band" d="M45 30c10 1.5 20 1.5 30 0l1 4c-11 1.5-21 1.5-32 0z" />
    </g>
  ),
  noel: (
    <g className="acc acc--noel">
      <path className="acc__santa" d="M32 36c6-14 18-24 34-22 10 2 18 10 22 18-8-4-16-4-22 2z" />
      <path className="acc__fur" d="M28 36c10-4 24-6 34-6s24 2 30 6c2 3 0 6-3 6-9-2-18-3-27-3s-21 1-30 3c-3 0-6-3-4-6z" />
      <circle className="acc__fur" cx="90" cy="34" r="6" />
    </g>
  ),
  printemps: (
    <g className="acc acc--printemps">
      <path className="acc__petal" d="M34 30c-6-6-4-14 2-14 4 0 6 4 6 8 2-4 8-6 10-2 3 5-3 10-9 10 4 2 6 8 2 10-5 3-9-3-9-8-2 4-8 6-10 2-3-5 3-9 8-6z" />
      <circle className="acc__heart" cx="40" cy="30" r="4" />
    </g>
  ),
  ete: (
    <g className="acc acc--ete">
      <path className="acc__lens" d="M36 53h20a3 3 0 0 1 3 3c0 7-5 12-12 12s-12-5-12-12a3 3 0 0 1 1-3zM64 53h20a3 3 0 0 1 1 3c0 7-5 12-12 12s-12-5-12-12a3 3 0 0 1 3-3z" />
      <path className="acc__frame" d="M56 57c2.5-2 5.5-2 8 0M35 56l-8-3M85 56l8-3" />
    </g>
  ),
};

interface MascotProps {
  mood?: Mood;
  size?: number;
  className?: string;
  /** Un compagnon précis ; sinon celui du joueur en cours. */
  character?: CharacterId;
  /** Sans respiration ni clignement (avatars, listes). */
  still?: boolean;
  /**
   * Chapeau à montrer (aperçu du vestiaire) ; null : aucun. Par défaut, le compagnon du joueur en
   * cours porte le chapeau choisi, et un compagnon précis (`character`) n'en porte pas.
   */
  hat?: WornHat | null;
  /** Aura à montrer (aperçu) ; par défaut, celle du joueur en cours pour son compagnon. */
  aura?: AuraId | null;
}

/** Durée de la réaction quand on touche Vif (voir `vif-poke` dans app.css). */
const POKE_MS = 650;

/**
 * Un compagnon, dans l'humeur demandée. Décoratif : le texte voisin dit toujours l'essentiel.
 * Il bouge selon son humeur (saut de joie, tête penchée qui réfléchit…) et réagit quand on le touche.
 */
export function Mascot({ mood = 'happy', size = 64, className, character, still, hat, aura }: MascotProps) {
  const active = useActiveCharacter();
  const activeHat = useActiveHat();
  const activeAura = useActiveAura();
  const season = useSeason();
  const who = character ?? active;
  const worn = hat !== undefined ? hat : character ? null : activeHat;
  const glow = aura !== undefined ? aura : character ? null : activeAura;
  const [poked, setPoked] = useState(false);
  const poke = () => {
    if (poked) return;
    setPoked(true);
    fx.tap();
    window.setTimeout(() => setPoked(false), POKE_MS);
  };
  return (
    <svg
      className={`vif vif--${mood} vif--${who}${still ? ' vif--still' : ''}${poked ? ' vif--poke' : ''}${glow ? ` vif--aura-${glow}` : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      onPointerDown={still ? undefined : poke}
    >
      <g className="vif__move">
        <g className="vif__bob">
          {who === 'vif' && worn && worn !== 'lunettes' ? vifBody(true) : BODIES[who]}
          <ellipse className="vif__glow" cx="46" cy="46" rx="13" ry="8" />
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
          {/* Un chapeau choisi remplace l'accessoire de saison. */}
          {worn ? renderHat(worn) : season && !still && ACCESSORIES[season.id]}
        </g>
      </g>
    </svg>
  );
}
