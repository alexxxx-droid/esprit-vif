import { useRef, useState, type ReactNode } from 'react';
import { dayKey, hasOfficialTest } from '../../core/daily';
import type { ThemeChoice } from '../../store/progress';
import { profileName } from '../../store/profiles';
import { ConfirmDialog, ScreenHeader, Toggle } from '../components/bits';
import { Icon, type IconName } from '../components/Icon';
import { ColorPicker, PlayersDialog, ProfileAvatar } from '../components/Players';
import { hapticsSupported } from '../fx/haptics';
import { voiceSupported } from '../fx/voice';
import { platform } from '../platform';
import { useProfileManager, useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { promptInstall, usePwa } from '../pwa';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

type Pending = { kind: 'import'; text: string } | { kind: 'reset' } | { kind: 'remove-player' } | null;

export function SettingsScreen() {
  const { settings, tests } = useProgress();
  const store = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const native = platform().native;
  const { canInstall } = usePwa();
  const manager = useProfileManager();
  const { profiles, active } = useProfiles();
  const [playersOpen, setPlayersOpen] = useState(false);
  const playerName = profileName(active, profiles);

  const say = (text: string) => {
    const id = Date.now();
    setToast({ text, id });
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  };

  const setReminder = async (reminder: boolean, reminderTime = settings.reminderTime) => {
    await store.updateSettings({ reminder, reminderTime });
    const schedule = platform().scheduleReminder;
    if (schedule) {
      const ok = await schedule(reminder ? reminderTime : null, { skipToday: hasOfficialTest(tests, dayKey()), ask: true });
      if (reminder && !ok) {
        await store.updateSettings({ reminder: false });
        say('Les notifications sont refusées : autorise-les dans les réglages du téléphone.');
      }
    }
  };

  const exportData = async () => {
    try {
      await platform().saveFile(`esprit-vif-${dayKey()}.json`, store.exportJson());
    } catch {
      say('L’export n’a pas abouti.');
    }
  };

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'remove-player') {
        setPending(null);
        await manager.remove(active.id);
        return;
      }
      if (pending.kind === 'import') {
        await store.importJson(pending.text);
        say('Sauvegarde importée. Bon retour !');
      } else {
        await store.reset();
        say('Ta progression a été remise à zéro.');
      }
    } catch (error) {
      say(error instanceof Error ? error.message : 'Opération impossible.');
    }
    setPending(null);
  };

  return (
    <div className="screen screen-in settings">
      <ScreenHeader title="Réglages" />

      <Section title="Joueur">
        <div className="player-edit">
          <ProfileAvatar profile={active} profiles={profiles} size={52} />
          <label className="field player-edit__name">
            <span className="field__label">Prénom</span>
            <input
              key={active.id}
              className="field__input"
              defaultValue={active.name}
              maxLength={16}
              placeholder={playerName}
              onBlur={(event) => {
                if (event.target.value.trim() !== active.name) void manager.update(active.id, { name: event.target.value });
              }}
            />
          </label>
        </div>
        <ColorPicker value={active.color} onChange={(color) => void manager.update(active.id, { color })} label="Couleur de l’avatar" />
        <div className="data-actions">
          <ActionRow icon="users" label={profiles.length > 1 ? 'Changer de joueur ou en ajouter un' : 'Ajouter un joueur'} onClick={() => setPlayersOpen(true)} />
          {profiles.length > 1 && <ActionRow icon="trash" label={`Supprimer le joueur ${playerName}`} danger onClick={() => setPending({ kind: 'remove-player' })} />}
        </div>
        <p className="hint">Jusqu’à 4 joueurs sur cet appareil, chacun avec ses niveaux, ses tests et ses réglages.</p>
      </Section>

      <Section title="Sons et vibrations">
        <Toggle
          icon="volume"
          label="Sons"
          description="Petits sons de jeu, générés sur l’appareil."
          checked={settings.sound}
          onChange={(sound) => void store.updateSettings({ sound })}
        />
        <Toggle
          icon="vibrate"
          label="Vibrations"
          description={hapticsSupported() ? 'Un léger retour à chaque toucher.' : 'Cet appareil ne vibre pas depuis le navigateur.'}
          checked={settings.vibration && hapticsSupported()}
          disabled={!hapticsSupported()}
          onChange={(vibration) => void store.updateSettings({ vibration })}
        />
      </Section>

      <Section title="Couleurs piégées">
        <Toggle
          icon="mic"
          label="Répondre à la voix"
          description={
            voiceSupported()
              ? 'Dis « rouge », « bleu »… Selon le navigateur, la voix peut être analysée par un service en ligne (celui de Google sur Chrome).'
              : native
                ? 'Pas de réponse à la voix dans l’appli Android : les boutons restent là.'
                : 'Ce navigateur ne propose pas la reconnaissance vocale : les boutons restent là.'
          }
          checked={settings.voice && voiceSupported()}
          disabled={!voiceSupported()}
          onChange={(voice) => void store.updateSettings({ voice })}
        />
      </Section>

      <Section title="Apparence">
        <div className="segmented" role="radiogroup" aria-label="Thème">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === theme.value}
              className="segmented__option"
              onClick={() => void store.updateSettings({ theme: theme.value })}
            >
              {theme.label}
            </button>
          ))}
        </div>
        <p className="hint">« Auto » suit le réglage clair ou sombre de ton appareil.</p>
      </Section>

      <Section title="Rappel quotidien">
        <Toggle
          icon="bell"
          label="Me rappeler le test du jour"
          description={
            native
              ? 'Une notification à l’heure choisie, les jours où le test n’est pas encore fait.'
              : 'Un bandeau sur l’accueil à partir de l’heure choisie. Pour une vraie notification, installe l’appli Android.'
          }
          checked={settings.reminder}
          onChange={(reminder) => void setReminder(reminder)}
        />
        {settings.reminder && (
          <label className="time-field">
            <span>Heure du rappel</span>
            <input
              type="time"
              value={settings.reminderTime}
              required
              onChange={(event) => event.target.value && void setReminder(true, event.target.value)}
            />
          </label>
        )}
      </Section>

      {canInstall && (
        <Section title="Appli">
          <ActionRow
            icon="download"
            label="Installer Esprit Vif sur cet appareil"
            onClick={async () => {
              if (await promptInstall()) say('Esprit Vif est installée. À bientôt sur ton écran d’accueil !');
            }}
          />
        </Section>
      )}

      <Section title="Mes données">
        <p className="hint">Tout reste sur cet appareil. Exporte une sauvegarde pour la garder ou la transférer.</p>
        <div className="data-actions">
          <ActionRow icon="download" label="Exporter ma progression" onClick={() => void exportData()} />
          <ActionRow icon="upload" label="Importer une sauvegarde" onClick={() => fileInput.current?.click()} />
          <ActionRow icon="trash" label="Tout effacer" danger onClick={() => setPending({ kind: 'reset' })} />
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) setPending({ kind: 'import', text: await file.text() });
          }}
        />
      </Section>

      <Section title="À propos">
        <div className="about">
          <p>
            <strong>Esprit Vif</strong> · version {__APP_VERSION__}
          </p>
          <p>Pas de compte, pas de publicité, aucun pistage : tes données ne quittent jamais ton appareil.</p>
          <p>L’âge cérébral est un indicateur ludique, pas une mesure médicale.</p>
        </div>
      </Section>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'import' ? 'Importer cette sauvegarde ?' : pending?.kind === 'remove-player' ? `Supprimer ${playerName} ?` : 'Tout effacer ?'}
        confirmLabel={pending?.kind === 'import' ? 'Importer' : pending?.kind === 'remove-player' ? 'Supprimer' : 'Effacer'}
        danger={pending?.kind === 'reset' || pending?.kind === 'remove-player'}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'import'
          ? 'Ta progression actuelle sera remplacée par celle du fichier.'
          : pending?.kind === 'remove-player'
            ? `Le profil de ${playerName} et toute sa progression seront supprimés de cet appareil.`
            : 'Parties, tests, records et niveaux seront supprimés de cet appareil. Pense à exporter une sauvegarde avant.'}
      </ConfirmDialog>

      <PlayersDialog open={playersOpen} onClose={() => setPlayersOpen(false)} />

      {toast && (
        <p className="toast" role="status" key={toast.id}>
          {toast.text}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings__section">
      <h2 className="section-title">{title}</h2>
      <div className="settings__card">{children}</div>
    </section>
  );
}

function ActionRow({ icon, label, danger, onClick }: { icon: IconName; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`action-row${danger ? ' action-row--danger' : ''}`} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
