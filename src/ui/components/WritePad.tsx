import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { recognizeDigit, type Pt } from '../../core/handwriting';
import { fx } from '../fx/fx';
import { Icon } from './Icon';
import { TapButton } from './TapButton';

/** Pause sans nouveau trait avant de lire le chiffre : le temps de barrer un 7 ou de finir un 4. */
const SETTLE_MS = 420;

function paint(canvas: HTMLCanvasElement, strokes: readonly Pt[][]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = canvas.width / (canvas.clientWidth || 1);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.strokeStyle = getComputedStyle(canvas).color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x, stroke[0].y, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

interface WritePadProps {
  onDigit: (digit: string) => void;
  onErase: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  /** Revenir au pavé de touches. */
  onUseKeys: () => void;
}

/** Zone où l'on écrit sa réponse au doigt, un chiffre après l'autre. */
export function WritePad({ onDigit, onErase, onSubmit, disabled, onUseKeys }: WritePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const pointer = useRef<number | null>(null);
  const timer = useRef(0);
  // Le chiffre se lit après une pause : il faut alors la version à jour de onDigit, pas celle du trait.
  const latest = useRef(onDigit);
  const [inked, setInked] = useState(false);
  const [read, setRead] = useState<{ digit: string | null; n: number } | null>(null);

  useEffect(() => {
    latest.current = onDigit;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      paint(canvas, strokes.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
  }, []);

  /** Oublie le tracé en cours (sans toucher à l'affichage React). */
  const wipe = () => {
    window.clearTimeout(timer.current);
    strokes.current = [];
    pointer.current = null;
    if (canvasRef.current) paint(canvasRef.current, []);
  };

  const clear = () => {
    wipe();
    setInked(false);
  };

  // Partie en pause (révélation, fin de manche) : ce qui était en cours d'écriture s'efface.
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) setInked(false);
  }
  useEffect(() => {
    if (!disabled) return;
    window.clearTimeout(timer.current);
    strokes.current = [];
    pointer.current = null;
    if (canvasRef.current) paint(canvasRef.current, []);
  }, [disabled]);

  const settle = () => {
    const result = recognizeDigit(strokes.current);
    clear();
    setRead((previous) => ({ digit: result?.digit ?? null, n: (previous?.n ?? 0) + 1 }));
    if (result) latest.current(result.digit);
    else fx.tap();
  };

  const at = (event: { clientX: number; clientY: number }): Pt => {
    const box = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const down = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || pointer.current !== null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    window.clearTimeout(timer.current);
    strokes.current.push([at(event)]);
    setInked(true);
    setRead(null);
    paint(event.currentTarget, strokes.current);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointer.current) return;
    const stroke = strokes.current[strokes.current.length - 1];
    const native = event.nativeEvent;
    for (const e of native.getCoalescedEvents?.() ?? [native]) stroke.push(at(e));
    paint(event.currentTarget, strokes.current);
  };

  const up = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerId !== pointer.current) return;
    pointer.current = null;
    timer.current = window.setTimeout(settle, SETTLE_MS);
  };

  const erase = () => {
    // Un chiffre en cours d'écriture s'efface d'abord ; sinon, le dernier chiffre de la réponse.
    if (strokes.current.length) {
      clear();
      fx.tap();
    } else onErase();
  };

  const eraseKey = (
    <TapButton className="numpad__key numpad__key--muted" onTap={erase} aria-label="Effacer" disabled={disabled}>
      <Icon name="erase" size={28} />
    </TapButton>
  );

  return (
    <div className={`writepad${disabled ? ' is-disabled' : ''}`} role="group" aria-label="Zone d’écriture">
      <div className="writepad__area">
        <canvas
          ref={canvasRef}
          className="writepad__canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Écris un chiffre avec le doigt"
        />
        {!inked && (
          <p key={read?.n ?? 0} className={`writepad__hint${read ? (read.digit ? ' is-read' : ' is-unread') : ''}`} aria-live="polite">
            {read ? (read.digit ?? '?') : 'Écris un chiffre ici'}
            {read && !read.digit && <small>Pas reconnu, réécris-le</small>}
          </p>
        )}
      </div>
      <div className="writepad__keys">
        {onSubmit ? eraseKey : <span aria-hidden="true" />}
        <TapButton className="numpad__key numpad__key--muted writepad__switch" onTap={onUseKeys} aria-label="Revenir au pavé de touches">
          <Icon name="keypad" size={26} />
        </TapButton>
        {onSubmit ? (
          <TapButton className="numpad__key numpad__key--ok" onTap={onSubmit} disabled={disabled}>
            OK
          </TapButton>
        ) : (
          eraseKey
        )}
      </div>
    </div>
  );
}
