import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { dayKey, hasOfficialTest } from '../../core/daily';
import { formatTime } from '../../core/format';
import { DOMAIN_ORDER, GAMES } from '../../core/games/registry';
import { LANG_NAMES, localized, PUBLISHED_LANGS, resolveLang, tr, type LangChoice } from '../../core/lang';
import { seasonThemeOf, themeName, THEMES as APP_THEMES, themeUnlocked, type PaletteChoice } from '../../core/themes';
import type { TextSize, ThemeChoice } from '../../store/progress';
import { cloudConfigured, revokeAccess } from '../../sync/google';
import { profileName } from '../../store/profiles';
import { ConfirmDialog, DomainBadge, ScreenHeader, Toggle } from '../components/bits';
import { Icon, type IconName } from '../components/Icon';
import { CharacterPicker, ColorPicker, PlayersDialog, ProfileAvatar } from '../components/Players';
import { syncProgress, useCloudPhase } from '../cloud';
import { hapticsSupported } from '../fx/haptics';
import { GOAL_LABELS, MAX_GOALS, toggleGoal } from '../goals';
import { voiceSupported } from '../fx/voice';
import { platform } from '../platform';
import { useProfileManager, useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { promptInstall, usePwa } from '../pwa';
import { navigate } from '../router';
import { useProgression } from '../progression';
import { useToday } from '../hooks';
import { usePremium, useResolvedTheme } from '../theme';
import { premiumController, usePremiumState } from '../premium';
import { clearJournal, readJournal, summarize, track } from '../../analytics/journal';
import { copyText } from '../platform';

// Les libellés portent les deux langues : `tr` se choisit à l'affichage, jamais au chargement.
const TEXT_SIZES: { value: TextSize; fr: string; en: string }[] = [
  { value: 'normal', fr: 'Normal', en: 'Normal' },
  { value: 'large', fr: 'Grand', en: 'Large' },
  { value: 'xlarge', fr: 'Très grand', en: 'Extra large' },
];

const THEMES: { value: ThemeChoice; fr: string; en: string }[] = [
  { value: 'auto', fr: 'Auto', en: 'Auto' },
  { value: 'light', fr: 'Clair', en: 'Light' },
  { value: 'dark', fr: 'Sombre', en: 'Dark' },
];

/** Le nom de chaque langue, écrit dans sa propre langue. */

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
  const detectedLanguage = LANG_NAMES[resolveLang('auto', navigator.language)];
  const languages: { value: LangChoice; label: string; sub?: string }[] = [
    { value: 'auto', label: tr('Auto', 'Auto'), sub: detectedLanguage },
    ...PUBLISHED_LANGS.map((value) => ({ value, label: LANG_NAMES[value] })),
  ];

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
      if (reminder && ok) track('reminder_enabled');
      if (reminder && !ok) {
        await store.updateSettings({ reminder: false });
        say(tr('Les notifications sont refusées : autorise-les dans les réglages du téléphone.', 'Notifications are blocked: allow them in your phone’s settings.'));
      }
    }
  };

  const exportData = async () => {
    try {
      await platform().saveFile(`esprit-vif-${dayKey()}.json`, store.exportJson());
    } catch {
      say(tr('L’export n’a pas abouti.', 'The export didn’t go through.'));
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
        say(tr('Sauvegarde importée. Bon retour !', 'Backup imported. Welcome back!'));
      } else {
        await store.reset();
        say(tr('Ta progression a été remise à zéro.', 'Your progress has been reset.'));
      }
    } catch (error) {
      say(error instanceof Error ? error.message : tr('Opération impossible.', 'That didn’t work.'));
    }
    setPending(null);
  };

  return (
    <div className="screen screen-in settings">
      <ScreenHeader title={tr('Réglages', 'Settings')} />

      <Section title={tr('Joueur', 'Player')}>
        <div className="player-edit">
          <ProfileAvatar profile={active} profiles={profiles} size={52} />
          <label className="field player-edit__name">
            <span className="field__label">{tr('Prénom', 'First name')}</span>
            <input
              key={active.id}
              className="field__input"
              defaultValue={active.name}
              maxLength={16}
              placeholder={playerName}
              enterKeyHint="done"
              // Entrée (la touche « OK » du clavier) valide le prénom, comme quitter le champ.
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              onBlur={(event) => {
                if (event.target.value.trim() !== active.name) void manager.update(active.id, { name: event.target.value });
              }}
            />
          </label>
        </div>
        <p className="setting-label">{tr('Compagnon', 'Companion')}</p>
        <CharacterPicker value={active.character} onChange={(character) => void manager.update(active.id, { character })} />
        <p className="setting-label">{tr('Couleur', 'Color')}</p>
        <ColorPicker value={active.color} onChange={(color) => void manager.update(active.id, { color })} label={tr('Couleur de l’avatar', 'Avatar color')} />
        <div className="data-actions">
          <ActionRow
            icon="users"
            label={profiles.length > 1 ? tr('Changer de joueur ou en ajouter un', 'Switch players or add one') : tr('Ajouter un joueur', 'Add a player')}
            onClick={() => setPlayersOpen(true)}
          />
          {profiles.length > 1 && (
            <ActionRow
              icon="trash"
              label={tr(`Supprimer le joueur ${playerName}`, `Delete player ${playerName}`)}
              danger
              onClick={() => setPending({ kind: 'remove-player' })}
            />
          )}
        </div>
        <p className="hint">
          {tr(
            'Jusqu’à 4 joueurs sur cet appareil, chacun avec ses niveaux, ses tests et ses réglages.',
            'Up to 4 players on this device, each with their own levels, tests and settings.',
          )}
        </p>
      </Section>

      <Section title={tr('Mes objectifs', 'My goals')}>
        <p className="hint">
          {tr(
            `Jusqu’à ${MAX_GOALS} domaines que ta séance du jour mettra en avant.`,
            `Up to ${MAX_GOALS} areas for your daily session to focus on.`,
          )}
        </p>
        <div className="goals goals--compact" role="group" aria-label={tr('Objectifs', 'Goals')}>
          {DOMAIN_ORDER.map((domain) => {
            const on = settings.goals.includes(domain);
            return (
              <button
                key={domain}
                type="button"
                className={`goal${on ? ' is-on' : ''}`}
                aria-pressed={on}
                disabled={!on && settings.goals.length >= MAX_GOALS}
                onClick={() => void store.updateSettings({ goals: toggleGoal(settings.goals, domain) })}
              >
                <DomainBadge domain={domain} size={30} />
                <span>{GOAL_LABELS[domain]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={tr('Sons et vibrations', 'Sound and vibration')}>
        <Toggle
          icon="volume"
          label={tr('Sons', 'Sounds')}
          description={tr('Petits sons de jeu, générés sur l’appareil.', 'Little game sounds, made right on the device.')}
          checked={settings.sound}
          onChange={(sound) => void store.updateSettings({ sound })}
        />
        <Toggle
          icon="music"
          label={tr('Musique d’ambiance', 'Background music')}
          description={tr(
            'Une musique douce pendant les parties, différente pour chaque domaine, composée sur l’appareil.',
            'Soft music while you play, different for each area, composed right on the device.',
          )}
          checked={settings.music}
          onChange={(music) => void store.updateSettings({ music })}
        />
        {settings.music && (
          <Slider label={tr('Volume de la musique', 'Music volume')} value={settings.musicVolume} onChange={(musicVolume) => void store.updateSettings({ musicVolume })} />
        )}
        {settings.sound && (
          <Slider label={tr('Volume des effets', 'Effects volume')} value={settings.effectsVolume} onChange={(effectsVolume) => void store.updateSettings({ effectsVolume })} />
        )}
        <Toggle
          icon="vibrate"
          label={tr('Vibrations', 'Vibration')}
          description={
            hapticsSupported()
              ? tr('Un léger retour à chaque toucher.', 'A light buzz with every tap.')
              : tr('Cet appareil ne vibre pas depuis le navigateur.', 'This device can’t vibrate from the browser.')
          }
          checked={settings.vibration && hapticsSupported()}
          disabled={!hapticsSupported()}
          onChange={(vibration) => void store.updateSettings({ vibration })}
        />
      </Section>

      <Section title={GAMES.stroop.name}>
        <Toggle
          icon="mic"
          label={tr('Répondre à la voix', 'Answer by voice')}
          description={
            voiceSupported()
              ? tr(
                  'Dis « rouge », « bleu »… Selon le navigateur, la voix peut être analysée par un service en ligne (celui de Google sur Chrome).',
                  'Say “red”, “blue”… Depending on the browser, your voice may be processed by an online service (Google’s, on Chrome).',
                )
              : native
                ? tr('Pas de réponse à la voix dans l’appli Android : les boutons restent là.', 'No voice answers in the Android app: the buttons are still there.')
                : tr(
                    'Ce navigateur ne propose pas la reconnaissance vocale : les boutons restent là.',
                    'This browser doesn’t offer speech recognition: the buttons are still there.',
                  )
          }
          checked={settings.voice && voiceSupported()}
          disabled={!voiceSupported()}
          onChange={(voice) => void store.updateSettings({ voice })}
        />
      </Section>

      <Section title={tr('Apparence', 'Appearance')}>
        <ThemePicker />
        <p className="setting-label">{tr('Clair ou sombre', 'Light or dark')}</p>
        <div className="segmented" role="radiogroup" aria-label={tr('Clair ou sombre', 'Light or dark')}>
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === theme.value}
              className="segmented__option"
              onClick={() => void store.updateSettings({ theme: theme.value })}
            >
              {localized(theme)}
            </button>
          ))}
        </div>
        <p className="hint">{tr('« Auto » suit le réglage clair ou sombre de ton appareil.', '“Auto” follows your device’s light or dark setting.')}</p>
        <p className="setting-label">{tr('Langue', 'Language')}</p>
        <div className="segmented segmented--tight segmented--langs" role="radiogroup" aria-label={tr('Langue', 'Language')}>
          {languages.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={settings.language === option.value}
              className="segmented__option"
              onClick={() => void store.updateSettings({ language: option.value })}
            >
              {option.label}
              {option.sub && <small style={{ display: 'block', color: 'var(--ink-3)', fontSize: '0.75rem', fontWeight: 600 }}>{option.sub}</small>}
            </button>
          ))}
        </div>
        <Toggle
          icon="pumpkin"
          label={tr('Thèmes de saison', 'Seasonal themes')}
          description={tr(
            'Les couleurs et le décor de la saison (neige, pétales, lucioles, feuilles) avec le thème « Auto », et les fêtes : Halloween, Noël… avec leur accessoire et leur trophée.',
            'Seasonal colors and scenery (snow, petals, fireflies, leaves) with the “Auto” theme, plus holidays like Halloween and Christmas with their accessory and trophy.',
          )}
          checked={settings.seasonal}
          onChange={(seasonal) => void store.updateSettings({ seasonal })}
        />
        <Toggle
          icon="flame"
          label={tr('Montrer ma série', 'Show my streak')}
          description={tr(
            'Les jours d’affilée sur l’accueil, dans les Progrès et sur le widget. Masquée, elle n’enlève rien : trophées et chapeaux de série restent à gagner.',
            'Days in a row on the home screen, in Progress and on the widget. Hidden, nothing is lost: streak trophies and hats can still be earned.',
          )}
          checked={settings.showStreak}
          onChange={(showStreak) => void store.updateSettings({ showStreak })}
        />
      </Section>

      <Section title={tr('Accessibilité', 'Accessibility')}>
        <p className="setting-label">{tr('Taille du texte', 'Text size')}</p>
        <div className="segmented segmented--tight" role="radiogroup" aria-label={tr('Taille du texte', 'Text size')}>
          {TEXT_SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              role="radio"
              aria-checked={settings.textSize === size.value}
              className="segmented__option"
              onClick={() => void store.updateSettings({ textSize: size.value })}
            >
              {localized(size)}
            </button>
          ))}
        </div>
        <Toggle
          icon="contrast"
          label={tr('Contraste renforcé', 'High contrast')}
          description={tr('Textes plus foncés et contours nets autour des cartes et des boutons.', 'Darker text and crisp outlines around cards and buttons.')}
          checked={settings.highContrast}
          onChange={(highContrast) => void store.updateSettings({ highContrast })}
        />
        <Toggle
          icon="clock"
          label={tr('Temps généreux', 'Extra time')}
          description={tr(
            'Les éléments restent affichés plus longtemps et le temps pour réagir s’allonge de moitié.',
            'Items stay on screen longer and you get 50% more time to react.',
          )}
          checked={settings.generousTime}
          onChange={(generousTime) => void store.updateSettings({ generousTime })}
        />
        <Toggle
          icon="hand"
          label={tr('Mode gaucher', 'Left-handed mode')}
          description={tr('La touche Effacer du pavé numérique passe à gauche, sous le pouce.', 'The keypad’s erase key moves to the left, under your thumb.')}
          checked={settings.leftHanded}
          onChange={(leftHanded) => void store.updateSettings({ leftHanded })}
        />
        <Toggle
          icon="pen"
          label={tr('Écrire les chiffres au doigt', 'Write numbers with your finger')}
          description={tr(
            'Dans les jeux de nombres, tu écris ta réponse chiffre par chiffre au lieu de toucher le pavé. Le choix existe aussi à l’intro de chaque jeu.',
            'In number games, you write your answer digit by digit instead of tapping the keypad. You can also choose on each game’s intro screen.',
          )}
          checked={settings.handwriting}
          onChange={(handwriting) => void store.updateSettings({ handwriting })}
        />
        <Toggle
          icon="pause"
          label={tr('Moins d’animations', 'Reduce motion')}
          description={tr(
            'Plus de mouvements décoratifs (confettis, glissements). Suit aussi le réglage du téléphone.',
            'No more decorative motion (confetti, slides). Also follows your phone’s setting.',
          )}
          checked={settings.reduceMotion}
          onChange={(reduceMotion) => void store.updateSettings({ reduceMotion })}
        />
      </Section>

      <Section title={tr('Rappel quotidien', 'Daily reminder')}>
        <Toggle
          icon="bell"
          label={tr('Me rappeler le test du jour', 'Remind me about the daily test')}
          description={
            native
              ? tr(
                  'Une notification à l’heure choisie, les jours où le test n’est pas encore fait.',
                  'A notification at the time you pick, on days when the test isn’t done yet.',
                )
              : tr(
                  'Un bandeau sur l’accueil à partir de l’heure choisie. Pour une vraie notification, installe l’appli Android.',
                  'A banner on the home screen from the time you pick. For a real notification, install the Android app.',
                )
          }
          checked={settings.reminder}
          onChange={(reminder) => void setReminder(reminder)}
        />
        {settings.reminder && (
          <label className="time-field">
            <span>{tr('Heure du rappel', 'Reminder time')}</span>
            <input
              type="time"
              value={settings.reminderTime}
              required
              onChange={(event) => event.target.value && void setReminder(true, event.target.value)}
            />
          </label>
        )}
      </Section>

      {platform().pinWidget && (
        <Section title={tr('Écran d’accueil', 'Home screen')}>
          <p className="hint">
            {tr(
              'Un widget montre ta série et le test du jour, avec deux boutons pour lancer le test ou la séance. Un appui long sur l’icône d’Esprit Vif donne aussi des raccourcis.',
              'A widget shows your streak and the daily test, with two buttons to start the test or the session. Long-press the Esprit Vif icon for shortcuts too.',
            )}
          </p>
          <ActionRow
            icon="plus"
            label={tr('Ajouter le widget', 'Add the widget')}
            onClick={async () => {
              const asked = await platform().pinWidget?.();
              if (!asked) say(tr('Appuie longuement sur ton écran d’accueil, puis Widgets, puis Esprit Vif.', 'Long-press your home screen, then tap Widgets, then Esprit Vif.'));
            }}
          />
        </Section>
      )}

      {canInstall && (
        <Section title={tr('Appli', 'App')}>
          <ActionRow
            icon="download"
            label={tr('Installer Esprit Vif sur cet appareil', 'Install Esprit Vif on this device')}
            onClick={async () => {
              if (await promptInstall()) say(tr('Esprit Vif est installée. À bientôt sur ton écran d’accueil !', 'Esprit Vif is installed. See you on your home screen!'));
            }}
          />
        </Section>
      )}

      <PremiumSection />

      <CloudSection say={say} />

      <Section title={tr('Mes données', 'My data')}>
        <p className="hint">
          {settings.cloud.linked && cloudConfigured()
            ? tr(
                'Ta progression est sur cet appareil et sur ton Google Drive. Tu peux aussi l’exporter ou la transférer.',
                'Your progress is on this device and on your Google Drive. You can also export or transfer it.',
              )
            : tr('Tout reste sur cet appareil. Exporte une sauvegarde pour la garder ou la transférer.', 'Everything stays on this device. Export a backup to keep it safe or move it.')}
        </p>
        <div className="data-actions">
          <ActionRow icon="share" label={tr('Transférer vers un autre appareil (QR code)', 'Transfer to another device (QR code)')} onClick={() => navigate({ name: 'transfer' })} />
          <ActionRow icon="download" label={tr('Exporter ma progression', 'Export my progress')} onClick={() => void exportData()} />
          <ActionRow icon="upload" label={tr('Importer une sauvegarde', 'Import a backup')} onClick={() => fileInput.current?.click()} />
          <ActionRow icon="trash" label={tr('Tout effacer', 'Erase everything')} danger onClick={() => setPending({ kind: 'reset' })} />
        </div>
        <JournalRow say={say} />
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

      <Section title={tr('À propos', 'About')}>
        <div className="about">
          <p>
            <strong>Esprit Vif</strong> · version {__APP_VERSION__}
          </p>
          <p>
            {tr(
              'Pas de compte, pas de publicité, aucun pistage : tes données ne quittent jamais ton appareil.',
              'No account, no ads, no tracking: your data never leaves your device.',
            )}
          </p>
          <p>{tr('L’âge cérébral est un indicateur ludique, pas une mesure médicale.', 'Brain age is a playful indicator, not a medical measure.')}</p>
        </div>
      </Section>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'import'
            ? tr('Importer cette sauvegarde ?', 'Import this backup?')
            : pending?.kind === 'remove-player'
              ? tr(`Supprimer ${playerName} ?`, `Delete ${playerName}?`)
              : tr('Tout effacer ?', 'Erase everything?')
        }
        confirmLabel={
          pending?.kind === 'import' ? tr('Importer', 'Import') : pending?.kind === 'remove-player' ? tr('Supprimer', 'Delete') : tr('Effacer', 'Erase')
        }
        danger={pending?.kind === 'reset' || pending?.kind === 'remove-player'}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'import'
          ? tr('Ta progression actuelle sera remplacée par celle du fichier.', 'Your current progress will be replaced by the one in the file.')
          : pending?.kind === 'remove-player'
            ? tr(
                `Le profil de ${playerName} et toute sa progression seront supprimés de cet appareil.`,
                `${playerName}’s profile and all their progress will be deleted from this device.`,
              )
            : tr(
                'Parties, tests, records et niveaux seront supprimés de cet appareil. Pense à exporter une sauvegarde avant.',
                'Games, tests, best scores and levels will be deleted from this device. Remember to export a backup first.',
              )}
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

/** Sauvegarde Google Drive, facultative : montrée seulement si l'appli a son identifiant Google. */
function CloudSection({ say }: { say: (text: string) => void }) {
  const store = useStore();
  const manager = useProfileManager();
  const { settings } = useProgress();
  const phase = useCloudPhase();
  const [busy, setBusy] = useState(false);
  if (!cloudConfigured()) return null;
  const { cloud } = settings;

  const connect = async () => {
    setBusy(true);
    const result = await syncProgress(store, manager, true);
    setBusy(false);
    if (!result) say(tr('Connexion à Google impossible pour le moment.', 'Couldn’t reach Google right now.'));
    else if (!cloud.linked)
      say(result.changedLocal ? tr('Progression récupérée depuis ton Drive.', 'Progress restored from your Drive.') : tr('Sauvegarde Drive activée.', 'Drive backup is on.'));
  };

  const disconnect = async () => {
    await revokeAccess();
    await store.updateSettings({ cloud: { linked: false, email: '', lastSync: '' } });
    say(tr('Sauvegarde Drive arrêtée sur cet appareil : ta progression reste ici.', 'Drive backup stopped on this device: your progress stays here.'));
  };

  const last = cloud.lastSync ? new Date(cloud.lastSync) : null;
  const status =
    phase === 'syncing' || busy
      ? tr('Synchronisation…', 'Syncing…')
      : phase === 'paused'
        ? tr('En pause : touche « Synchroniser maintenant ».', 'Paused: tap “Sync now”.')
        : phase === 'error'
          ? tr('Pas de réseau : nouvel essai à la prochaine partie.', 'No connection: will retry after your next game.')
          : last
            ? tr(`Synchronisé à ${formatTime(last)}`, `Synced at ${formatTime(last)}`)
            : '';

  return (
    <Section title={tr('Sauvegarde Google Drive', 'Google Drive backup')}>
      {cloud.linked ? (
        <>
          <p className="cloud-status">
            <Icon name="cloud" />
            <span>
              {tr('Connecté à ', 'Connected to ')}
              <strong>{cloud.email || 'Google'}</strong>
              {status && <small>{status}</small>}
            </span>
          </p>
          <div className="data-actions">
            <ActionRow icon="replay" label={tr('Synchroniser maintenant', 'Sync now')} onClick={() => void connect()} />
            <ActionRow icon="close" label={tr('Arrêter la sauvegarde Drive', 'Stop Drive backup')} onClick={() => void disconnect()} />
          </div>
        </>
      ) : (
        <>
          <p className="hint">
            {tr(
              'Retrouve ta progression sur ta tablette ou un nouveau téléphone. Elle est rangée dans un dossier caché de ton Google Drive, que toi seul vois. Facultatif, sans publicité ni pistage.',
              'Pick up your progress on your tablet or a new phone. It is kept in a hidden folder of your Google Drive that only you can see. Optional, no ads, no tracking.',
            )}
          </p>
          <div className="data-actions">
            <ActionRow icon="cloud" label={busy ? tr('Connexion…', 'Connecting…') : tr('Se connecter avec Google', 'Sign in with Google')} onClick={() => void connect()} />
          </div>
        </>
      )}
    </Section>
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

/** Réglette de volume, de 0 à 100 %. */
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100);
  return (
    <label className="slider">
      <span className="slider__label">
        {label}
        <span className="slider__value">{tr(`${percent}\u00a0%`, `${percent}%`)}</span>
      </span>
      <input type="range" min={0} max={1} step={0.1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
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

/** Les thèmes de l'appli : la saison (« Auto »), ceux gagnés en montant de niveau, ceux de Premium. */
function ThemePicker() {
  const { settings } = useProgress();
  const store = useStore();
  const { rank } = useProgression();
  const premium = usePremium();
  const today = useToday();
  const season = seasonThemeOf(today);
  const current = useResolvedTheme();
  const choices: { id: PaletteChoice; name: string; light: string; dark: string; tint: string; lock: string | null; premium?: boolean }[] = [
    { id: 'auto', name: tr(`Auto · ${themeName(season.id)}`, `Auto · ${themeName(season.id)}`), light: season.light, dark: season.dark, tint: season.tint, lock: null },
    ...APP_THEMES.map((theme) => ({
      id: theme.id,
      name: themeName(theme.id),
      light: theme.light,
      dark: theme.dark,
      tint: theme.tint,
      premium: theme.unlock.kind === 'premium',
      lock: themeUnlocked(theme, rank.level, premium)
        ? null
        : theme.unlock.kind === 'level'
          ? tr(`Niveau ${theme.unlock.level}`, `Level ${theme.unlock.level}`)
          : tr('Premium', 'Premium'),
    })),
  ];
  return (
    <>
      <p className="setting-label">{tr('Thème', 'Theme')}</p>
      <div className="theme-picker" role="radiogroup" aria-label={tr('Thème', 'Theme')}>
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={settings.palette === choice.id}
            aria-disabled={choice.lock !== null}
            className={`theme-swatch${choice.lock ? ' is-locked' : ''}`}
            style={{ '--sw-light': choice.light, '--sw-dark': choice.dark, '--sw-tint': choice.tint } as CSSProperties}
            onClick={() => {
              if (!choice.lock) void store.updateSettings({ palette: choice.id });
              else if (choice.premium) navigate({ name: 'premium', focus: choice.id });
            }}
          >
            <span className="theme-swatch__dot" aria-hidden="true">
              {choice.lock && <Icon name="lock" size={14} />}
            </span>
            <span className="theme-swatch__name">{choice.name}</span>
            {choice.lock && <span className="theme-swatch__lock">{choice.lock}</span>}
          </button>
        ))}
      </div>
      <p className="hint">
        {settings.palette === 'auto' && !settings.seasonal
          ? tr('« Auto » garde le thème classique tant que les thèmes de saison sont coupés.', '“Auto” keeps the classic theme while seasonal themes are off.')
          : tr(
              `Thème actuel : ${themeName(current.id)}. De nouveaux thèmes se gagnent en montant de niveau${premium ? '' : ' ; trois autres viennent avec Premium'}.`,
              `Current theme: ${themeName(current.id)}. New themes unlock as you level up${premium ? '' : '; three more come with Premium'}.`,
            )}
      </p>
    </>
  );
}

/** Esprit Vif Premium : son état, l'écran de présentation, et la restauration des achats. */
function PremiumSection() {
  const state = usePremiumState();
  const status = state.premium
    ? tr('Actif sur cet appareil. Merci !', 'Active on this device. Thank you!')
    : state.shop === 'web'
      ? tr('Proposé dans l’appli Android (Google Play).', 'Available in the Android app (Google Play).')
      : state.shop === 'not-configured'
        ? tr('Bientôt disponible.', 'Coming soon.')
        : state.product
          ? tr(`Achat unique : ${state.product.price}`, `One-time purchase: ${state.product.price}`)
          : tr('Achat unique, sans abonnement.', 'One-time purchase, no subscription.');
  return (
    <Section title="Esprit Vif Premium">
      <div className="data-actions">
        <ActionRow icon="spark" label={state.premium ? tr('Voir Premium', 'View Premium') : tr('Découvrir Premium', 'Discover Premium')} onClick={() => navigate({ name: 'premium' })} />
        {state.shop !== 'web' && (
          <ActionRow icon="replay" label={state.busy === 'restore' ? tr('Vérification…', 'Checking…') : tr('Restaurer mes achats', 'Restore purchases')} onClick={() => void premiumController().restore()} />
        )}
      </div>
      <p className="hint">{status}</p>
    </Section>
  );
}

/**
 * Le journal d'utilisation : gardé sur cet appareil, jamais envoyé. Un testeur peut le copier pour
 * l'envoyer de lui-même ; on peut aussi l'effacer.
 */
function JournalRow({ say }: { say: (text: string) => void }) {
  // Effacer le journal redessine la ligne : le résumé se relit à chaque affichage.
  const [, setVersion] = useState(0);
  const summary = summarize(readJournal());
  return (
    <div className="journal">
      <p className="hint">
        {tr(
          `Journal d’utilisation : ${summary.total} événements, gardés sur cet appareil et jamais envoyés (aucun prénom, aucun score personnel identifiable).`,
          `Usage log: ${summary.total} events, kept on this device and never sent (no names, nothing identifying).`,
        )}
      </p>
      <div className="journal__actions">
        <button
          type="button"
          className="btn btn--sm"
          onClick={async () => {
            const ok = await copyText(JSON.stringify(readJournal()));
            say(ok ? tr('Journal copié.', 'Log copied.') : tr('Copie impossible sur ce navigateur.', 'Copying isn’t possible in this browser.'));
          }}
        >
          {tr('Copier le journal', 'Copy the log')}
        </button>
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() => {
            clearJournal();
            setVersion((v) => v + 1);
            say(tr('Journal effacé.', 'Log cleared.'));
          }}
        >
          {tr('Effacer', 'Clear')}
        </button>
      </div>
    </div>
  );
}
