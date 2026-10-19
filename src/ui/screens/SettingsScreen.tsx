import { useRef, useState, type ReactNode } from 'react';
import { dayKey } from '../../core/daily';
import type { ThemeChoice } from '../../store/progress';
import { ConfirmDialog, ScreenHeader, Toggle } from '../components/bits';
import { Icon, type IconName } from '../components/Icon';
import { hapticsSupported } from '../fx/haptics';
import { voiceSupported } from '../fx/voice';
import { platform } from '../platform';
import { useProgress, useStore } from '../progress-context';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

type Pending = { kind: 'import'; text: string } | { kind: 'reset' } | null;

export function SettingsScreen() {
  const { settings } = useProgress();
  const store = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const native = platform().native;

  const say = (text: string) => {
    const id = Date.now();
    setToast({ text, id });
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  };

  const setReminder = async (reminder: boolean, reminderTime = settings.reminderTime) => {
    await store.updateSettings({ reminder, reminderTime });
    const schedule = platform().scheduleReminder;
    if (schedule) {
      const ok = await schedule(reminder ? reminderTime : null);
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
              ? 'Une notification chaque jour à l’heure choisie.'
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
        title={pending?.kind === 'import' ? 'Importer cette sauvegarde ?' : 'Tout effacer ?'}
        confirmLabel={pending?.kind === 'import' ? 'Importer' : 'Effacer'}
        danger={pending?.kind === 'reset'}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'import'
          ? 'Ta progression actuelle sera remplacée par celle du fichier.'
          : 'Parties, tests, records et niveaux seront supprimés de cet appareil. Pense à exporter une sauvegarde avant.'}
      </ConfirmDialog>

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
