import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { setNativeHaptics, type HapticKind } from './ui/fx/haptics';
import { setPlatform, type ReminderOptions } from './ui/platform';

/**
 * Ce que l'appli Android fait de plus que le site : vraies notifications, vibrations natives,
 * bouton retour, partage de la sauvegarde. Chargé uniquement dans l'APK.
 */

const REMINDER_DAYS = 14;
const REMINDER_IDS = Array.from({ length: REMINDER_DAYS }, (_, i) => 100 + i);
const REMINDER_MESSAGES = [
  'Ton test du jour t’attend : cinq minutes suffisent.',
  'Trois petits jeux pour garder l’esprit vif ?',
  'Une pause pour ton cerveau ? Le test du jour est prêt.',
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
  for (let day = 0; notifications.length < REMINDER_DAYS && day <= REMINDER_DAYS; day++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes);
    if (at <= now || (day === 0 && skipToday)) continue;
    notifications.push({
      id: REMINDER_IDS[notifications.length],
      title: 'Esprit Vif',
      body: REMINDER_MESSAGES[day % REMINDER_MESSAGES.length],
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
  await Share.share({ title: 'Sauvegarde Esprit Vif', files: [uri], dialogTitle: 'Enregistrer ou envoyer la sauvegarde' });
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
  setPlatform({ native: true, saveFile, scheduleReminder });
  setNativeHaptics(vibrate);
  // Retour Android : écran précédent, ou sortie de l'appli depuis l'accueil.
  await App.addListener('backButton', ({ canGoBack }) => {
    if (!location.hash || location.hash === '#/') void App.exitApp();
    else if (canGoBack) history.back();
    else location.replace('#/');
  });
}
