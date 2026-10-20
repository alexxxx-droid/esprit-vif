import type { ButtonHTMLAttributes, Ref } from 'react';

interface TapButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  onTap: () => void;
  ref?: Ref<HTMLButtonElement>;
}

/** Délai pendant lequel le « click » qui suit un appui est ignoré (il fait doublon avec l'appui). */
const CLICK_AFTER_POINTER_MS = 800;

/**
 * Dernier appui sur un bouton de jeu, quel qu'il soit. Partagé entre tous les boutons : quand un appui
 * fait passer à la question suivante, les boutons sont recréés et le « click » de fin d'appui tombe sur
 * le nouveau bouton au même endroit. Avec une mémoire propre à chaque bouton, ce nouveau bouton ne
 * savait pas qu'il devait l'ignorer et répondait à la question suivante (Lettre manquante, 20-10-2026).
 */
let lastPointerTap = -Infinity;

/**
 * Bouton de jeu : réagit dès l'appui (pointerdown) pour ne pas perdre de temps,
 * et reste activable au clavier ou par un lecteur d'écran (click).
 */
export function TapButton({ onTap, disabled, ref, ...rest }: TapButtonProps) {
  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      {...rest}
      onPointerDown={(event) => {
        if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        lastPointerTap = event.timeStamp;
        onTap();
      }}
      onClick={(event) => {
        // Un click « clavier » ou lecteur d'écran n'a pas d'appui juste avant : il passe toujours.
        if (event.timeStamp - lastPointerTap < CLICK_AFTER_POINTER_MS) return;
        onTap();
      }}
    />
  );
}
