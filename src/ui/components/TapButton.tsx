import { useRef, type ButtonHTMLAttributes, type Ref } from 'react';

interface TapButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  onTap: () => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Bouton de jeu : réagit dès l'appui (pointerdown) pour ne pas perdre de temps,
 * et reste activable au clavier ou par un lecteur d'écran (click).
 */
export function TapButton({ onTap, disabled, ref, ...rest }: TapButtonProps) {
  const lastPointer = useRef(-Infinity);
  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      {...rest}
      onPointerDown={(event) => {
        if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        lastPointer.current = event.timeStamp;
        onTap();
      }}
      onClick={(event) => {
        if (event.timeStamp - lastPointer.current < 800) return;
        onTap();
      }}
    />
  );
}
