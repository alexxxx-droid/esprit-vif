import { useLayoutEffect, useRef } from 'react';

/**
 * Un calcul sur une ligne qui doit tenir dans la largeur de l'écran : si le texte déborde (les calculs
 * longs des niveaux avancés, « (37 + 26) × (14 − 8) »), sa police rétrécit juste ce qu'il faut.
 * Un texte qui tient garde sa taille habituelle. `content` : le texte affiché, pour remesurer quand il change.
 */
export function useFitWidth<T extends HTMLElement>(content: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      el.style.fontSize = '';
      const box = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight) - 8;
      const width = el.offsetWidth;
      if (width <= room) return;
      const style = getComputedStyle(el);
      const frame = width - el.clientWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const scale = Math.max(0.4, (room - frame) / (width - frame));
      el.style.fontSize = `${Math.floor(parseFloat(style.fontSize) * scale)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [content]);
  return ref;
}
