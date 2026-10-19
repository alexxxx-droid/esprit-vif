import { useEffect, useId, useRef, useState } from 'react';
import { CHARACTERS, type CharacterId } from '../../core/characters';
import { MAX_PROFILES, PROFILE_COLORS, profileName, type Profile } from '../../store/profiles';
import { useProfileManager, useProfiles } from '../profiles-context';
import { Icon } from './Icon';
import { Mascot } from './Mascot';

/** Avatar d'un joueur : la tête de son compagnon, sur la couleur qu'il a choisie. */
export function ProfileAvatar({ profile, size = 40 }: { profile: Profile; profiles?: readonly Profile[]; size?: number }) {
  return (
    <span className={`avatar avatar--c${profile.color}`} style={{ width: size, height: size }} aria-hidden="true">
      <Mascot character={profile.character} mood="happy" size={size * 0.92} still />
    </span>
  );
}

/** Choix du compagnon : Vif ou l'un des fruits. */
export function CharacterPicker({ value, onChange }: { value: CharacterId; onChange: (character: CharacterId) => void }) {
  return (
    <div className="characters" role="radiogroup" aria-label="Compagnon">
      {CHARACTERS.map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={value === c.id} className="character" onClick={() => onChange(c.id)}>
          <Mascot character={c.id} mood={value === c.id ? 'cheer' : 'happy'} size={54} still={value !== c.id} />
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Choix d'une des six couleurs d'avatar. */
export function ColorPicker({ value, onChange, label }: { value: number; onChange: (color: number) => void; label: string }) {
  return (
    <div className="color-swatches" role="radiogroup" aria-label={label}>
      {Array.from({ length: PROFILE_COLORS }, (_, color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={`Couleur ${color + 1}`}
          className={`color-swatch avatar--c${color}`}
          onClick={() => onChange(color)}
        >
          {value === color && <Icon name="check" size={18} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

/** « Qui joue ? » : changer de joueur ou en ajouter un (4 au maximum). */
export function PlayersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const manager = useProfileManager();
  const { profiles, active } = useProfiles();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(1);
  const [character, setCharacter] = useState<CharacterId>('pomme');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setAdding(false);
    setName('');
    onClose();
  };

  const choose = async (profileId: string) => {
    setBusy(true);
    await manager.switchTo(profileId);
    setBusy(false);
    close();
  };

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await manager.add(name, color, character);
    setBusy(false);
    close();
  };

  return (
    <dialog
      ref={ref}
      className="dialog players"
      aria-labelledby={`${id}-t`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <h2 className="dialog__title" id={`${id}-t`}>
        {adding ? 'Nouveau joueur' : 'Qui joue ?'}
      </h2>
      {adding ? (
        <form
          className="players__form"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label className="field">
            <span className="field__label">Prénom</span>
            <input className="field__input" value={name} maxLength={16} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Prénom" />
          </label>
          <span className="field__label">Compagnon</span>
          <CharacterPicker value={character} onChange={setCharacter} />
          <span className="field__label">Couleur</span>
          <ColorPicker value={color} onChange={setColor} label="Couleur de l’avatar" />
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Retour
            </button>
            <button type="submit" className="btn btn--primary" disabled={!name.trim() || busy}>
              Créer
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="dialog__body">Chaque joueur a ses niveaux, son âge cérébral et ses trophées.</p>
          <ul className="players__list">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  className={`player-row${profile.id === active.id ? ' is-active' : ''}`}
                  onClick={() => void choose(profile.id)}
                  disabled={busy}
                  aria-current={profile.id === active.id}
                >
                  <ProfileAvatar profile={profile} profiles={profiles} size={44} />
                  <span className="player-row__name">{profileName(profile, profiles)}</span>
                  {profile.id === active.id && <span className="player-row__now">en jeu</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={close}>
              Fermer
            </button>
            {profiles.length < MAX_PROFILES && (
              <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
                <Icon name="plus" size={18} />
                Ajouter
              </button>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
