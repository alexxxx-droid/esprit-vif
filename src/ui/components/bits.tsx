import { useEffect, useId, useRef, type ReactNode } from 'react';
import { DOMAINS } from '../../core/games/registry';
import type { Domain } from '../../core/types';
import { useCountUp } from '../hooks';
import { Icon, type IconName } from './Icon';
import { TapButton } from './TapButton';

export function DomainBadge({ domain, size = 40 }: { domain: Domain; size?: number }) {
  return (
    <span className={`domain-badge domain-badge--${domain}`} style={{ width: size, height: size }}>
      <Icon name={domain} size={Math.round(size * 0.55)} />
    </span>
  );
}

export function DomainChip({ domain }: { domain: Domain }) {
  return (
    <span className="domain-chip">
      <DomainBadge domain={domain} size={24} />
      {DOMAINS[domain].name}
    </span>
  );
}

export function ScreenHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="screen-head">
      <div>
        <h1 className="screen-title">{title}</h1>
        {subtitle && <p className="screen-subtitle">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

interface NumPadProps {
  onDigit: (digit: string) => void;
  onErase: () => void;
  /** Avec une touche « OK » (quand la réponse ne se valide pas toute seule). */
  onSubmit?: () => void;
  disabled?: boolean;
}

export function NumPad({ onDigit, onErase, onSubmit, disabled }: NumPadProps) {
  const erase = (
    <TapButton className="numpad__key numpad__key--muted" onTap={onErase} aria-label="Effacer" disabled={disabled}>
      <Icon name="erase" size={28} />
    </TapButton>
  );
  return (
    <div className="numpad" role="group" aria-label="Pavé numérique">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <TapButton key={d} className="numpad__key" onTap={() => onDigit(d)} disabled={disabled}>
          {d}
        </TapButton>
      ))}
      {onSubmit ? erase : <span aria-hidden="true" />}
      <TapButton className="numpad__key" onTap={() => onDigit('0')} disabled={disabled}>
        0
      </TapButton>
      {onSubmit ? (
        <TapButton className="numpad__key numpad__key--ok" onTap={onSubmit} disabled={disabled}>
          OK
        </TapButton>
      ) : (
        erase
      )}
    </div>
  );
}

export function ScoreRing({ score, size = 176 }: { score: number; size?: number }) {
  const shown = useCountUp(score);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`Score : ${score} sur 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="score-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="score-ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring__label" aria-hidden="true">
        <span className="score-ring__value">{shown}</span>
        <span className="score-ring__max">/100</span>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: ReactNode;
  icon?: IconName;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, description, icon, checked, disabled, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className={`setting${disabled ? ' setting--disabled' : ''}`}>
      {icon && (
        <span className="setting__icon">
          <Icon name={icon} />
        </span>
      )}
      <div className="setting__text">
        <span className="setting__label" id={`${id}-l`}>
          {label}
        </span>
        {description && (
          <span className="setting__desc" id={`${id}-d`}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-t`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 className="dialog__title" id={`${id}-t`}>
        {title}
      </h2>
      <div className="dialog__body">{children}</div>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
