import { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks';
import { Mascot } from './Mascot';

/** Durée de la traversée de l'écran, avant de se poser (voir `guide-walk` dans app.css). */
const WALK_MS = 1900;
/** Une seule traversée par lancement de l'appli : ensuite, Vif attend déjà sur le bouton. */
let walked = false;

/**
 * Vif, guide de l'accueil : il arrive en se dandinant, se pose sur le bouton principal et le montre
 * du doigt. Décoratif (le bouton se suffit à lui-même) ; sans animation, il est simplement assis là.
 */
export function VifGuide() {
  const reduced = useReducedMotion();
  const [walking, setWalking] = useState(() => !walked && !reduced);
  useEffect(() => {
    walked = true;
    if (!walking) return;
    const timer = window.setTimeout(() => setWalking(false), WALK_MS);
    return () => window.clearTimeout(timer);
  }, [walking]);
  return (
    <span className={`vif-guide${walking ? ' vif-guide--walk' : ''}`}>
      <Mascot mood={walking ? 'happy' : 'point'} size={58} className={walking ? 'vif--walking' : undefined} />
    </span>
  );
}
