import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import type { PlayBillingApi } from './premium/billing';
import { tr } from './core/lang';
import { NeedsConsent } from './sync/google';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { setNativeHaptics, type HapticKind } from './ui/fx/haptics';
import { setPlatform, type ReminderOptions, type ShareResult, type WidgetSummary } from './ui/platform';

/**
 * Ce que l'appli Android fait de plus que le site : vraies notifications, vibrations natives,
 * bouton retour, partage de la sauvegarde. Chargé uniquement dans l'APK.
 */

const REMINDER_DAYS = 14;
const REMINDER_IDS = Array.from({ length: REMINDER_DAYS }, (_, i) => 100 + i);
/** Les messages du rappel, dans la langue de l'appli au moment où il est programmé. */
const reminderMessages = () => [
  tr('Ton test du jour t’attend : cinq minutes suffisent.', 'Your daily test is waiting: five minutes is all it takes.'),
  tr('Trois petits jeux pour garder l’esprit vif ?', 'Three quick games to keep your mind sharp?'),
  tr('Une pause pour ton cerveau ? Le test du jour est prêt.', 'A break for your brain? Your daily test is ready.'),
];

/**
 * Programme le rappel des 14 prochains jours, un par un : on peut ainsi sauter aujourd'hui
 * quand le test est déjà fait. Sans ouverture de l'appli pendant deux semaines, les rappels
 * s'arrêtent d'eux-mêmes plutôt que d'insister.
 */
async function scheduleReminder(time: string | null, { skipToday, ask }: ReminderOptions): Promise<boolean> {
  await LocalNotifications.cancel({ notifications: REMINDER_IDS.map((id) => ({ id })) }).catch(() => undefined);
  if (!time) return true;

  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted' && ask) permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return false;

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const notifications = [];
  const messages = reminderMessages();
  for (let day = 0; notifications.length < REMINDER_DAYS && day <= REMINDER_DAYS; day++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes);
    if (at <= now || (day === 0 && skipToday)) continue;
    notifications.push({
      id: REMINDER_IDS[notifications.length],
      title: 'Esprit Vif',
      body: messages[day % messages.length],
      schedule: { at, allowWhileIdle: true },
      // Un rappel n'a pas besoin d'être à la seconde : pas d'alarme exacte, donc pas de détour
      // par l'écran système « Alarmes et rappels ».
      isExactNotification: false,
      smallIcon: 'ic_stat_spark',
      iconColor: '#4B39EF',
    });
  }
  await LocalNotifications.schedule({ notifications });
  return true;
}

async function saveFile(name: string, text: string) {
  const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({
    title: tr('Sauvegarde Esprit Vif', 'Esprit Vif backup'),
    files: [uri],
    dialogTitle: tr('Enregistrer ou envoyer la sauvegarde', 'Save or send the backup'),
  });
}

async function shareImage(name: string, image: Blob, text: string) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
  const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
  await Share.share({ title: 'Esprit Vif', text, files: [uri], dialogTitle: tr('Partager', 'Share') });
}

async function shareLink(text: string, url: string): Promise<ShareResult> {
  try {
    await Share.share({ title: 'Esprit Vif', text, url, dialogTitle: tr('Envoyer le défi', 'Send the challenge') });
    return 'shared';
  } catch {
    // Feuille fermée sans choisir d'appli.
    return 'cancelled';
  }
}

/** Le widget d'écran d'accueil : un petit module natif propre à l'appli (android/…/WidgetBridge.java). */
interface WidgetBridgePlugin {
  update(summary: WidgetSummary): Promise<void>;
  pin(): Promise<{ requested: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/** La sauvegarde Google Drive : un jeton par les services Google du téléphone (android/…/GoogleDrivePlugin.java). */
interface GoogleDrivePluginApi {
  authorize(options: { interactive: boolean }): Promise<{ token: string; expiresIn: number }>;
}

const GoogleDrive = registerPlugin<GoogleDrivePluginApi>('GoogleDrive');

/** Premium à vie par Google Play Billing (android/…/PlayBillingPlugin.java). */
const PlayBilling = registerPlugin<PlayBillingApi>('PlayBilling');

async function googleToken(interactive: boolean) {
  try {
    return await GoogleDrive.authorize({ interactive });
  } catch (error) {
    // Accord à demander (ou refusé) : la synchro attend que le joueur touche « Synchroniser ».
    if ((error as { code?: string }).code === 'NEEDS_CONSENT') throw new NeedsConsent('accord');
    throw error;
  }
}

async function updateWidget(summary: WidgetSummary) {
  await WidgetBridge.update(summary).catch(() => undefined);
}

async function pinWidget(): Promise<boolean> {
  const { requested } = await WidgetBridge.pin().catch(() => ({ requested: false }));
  return requested;
}

/** Liens espritvif://seance… venus des raccourcis de l'icône ou du widget : on ouvre l'écran demandé. */
function openAppLink(url: string) {
  const match = /^espritvif:\/\/(.*)$/.exec(url);
  if (match) location.hash = `#/${match[1]}`;
}

function vibrate(kind: HapticKind) {
  const effect =
    kind === 'tap'
      ? Haptics.impact({ style: ImpactStyle.Light })
      : kind === 'good'
        ? Haptics.impact({ style: ImpactStyle.Medium })
        : Haptics.notification({ type: kind === 'bad' ? NotificationType.Error : NotificationType.Success });
  void effect.catch(() => undefined);
}

export async function setupNative() {
  setPlatform({ native: true, saveFile, shareImage, shareLink, scheduleReminder, updateWidget, pinWidget, googleToken, billing: PlayBilling });
  setNativeHaptics(vibrate);
  // Retour Android : écran précédent, ou sortie de l'appli depuis l'accueil.
  const launch = await App.getLaunchUrl().catch(() => undefined);
  if (launch?.url) openAppLink(launch.url);
  await App.addListener('appUrlOpen', ({ url }) => openAppLink(url));
  await App.addListener('backButton', ({ canGoBack }) => {
    if (!location.hash || location.hash === '#/') void App.exitApp();
    else if (canGoBack) history.back();
    else location.replace('#/');
  });
}
