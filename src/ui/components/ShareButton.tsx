import { useState } from 'react';
import { tr } from '../../core/lang';
import { platform } from '../platform';
import { Icon } from './Icon';

interface ShareButtonProps {
  label: string;
  /** Prépare l'image et le message au moment du geste (rien n'est calculé d'avance). */
  build: () => Promise<{ image: Blob; name: string; text: string }>;
}

/** Bouton « Partager » : dessine la carte puis ouvre la feuille de partage du téléphone. */
export function ShareButton({ label, build }: ShareButtonProps) {
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      const { image, name, text } = await build();
      await platform().shareImage(name, image, text);
    } catch {
      // Partage impossible ou annulé : on n'insiste pas.
    }
    setBusy(false);
  };
  return (
    <button type="button" className="btn btn--lg share-btn" onClick={() => void share()} disabled={busy}>
      <Icon name="share" />
      {busy ? tr('Préparation…', 'Preparing…') : label}
    </button>
  );
}
