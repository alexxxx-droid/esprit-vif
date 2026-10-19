/**
 * Ce qui diffère entre le navigateur et l'appli Android : enregistrement de fichiers et rappel quotidien.
 * La version web est installée par défaut ; l'APK installe la sienne au démarrage.
 */
export interface ReminderOptions {
  /** Le test du jour est déjà fait : pas de rappel aujourd'hui. */
  skipToday: boolean;
  /** Demander l'autorisation si besoin (seulement quand l'utilisateur active le rappel). */
  ask: boolean;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Copie dans le presse-papiers ; faux si le navigateur refuse. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Ce qu'affiche le widget d'écran d'accueil (appli Android). */
export interface WidgetSummary {
  name: string;
  streak: number;
  /** Dernier jour où la série tient sans nouvelle partie (« AAAA-MM-JJ »), vide sans série. */
  streakUntil: string;
  /** Jour du dernier test officiel et son âge cérébral. */
  testDay: string;
  brainAge: number;
  /** Les textes du widget dans la langue de l'appli (« %d » reçoit un nombre). */
  texts: Record<'streakOne' | 'streakMany' | 'noStreak' | 'testDoneAge' | 'testDone' | 'testTodo' | 'test' | 'training' | 'session', string>;
}

export interface Platform {
  native: boolean;
  /** Propose le fichier à l'utilisateur (téléchargement ou partage). */
  saveFile(name: string, text: string): Promise<void>;
  /** Partage une image (feuille de partage du téléphone), ou la télécharge à défaut. */
  shareImage(name: string, image: Blob, text: string): Promise<void>;
  /** Envoie un lien (feuille de partage), ou le copie quand le partage n'existe pas. */
  shareLink(text: string, url: string): Promise<ShareResult>;
  /**
   * Programme (heure « HH:MM ») ou annule (null) la notification quotidienne.
   * Renvoie faux si les notifications sont refusées. Absent sur le web.
   */
  scheduleReminder?: (time: string | null, options: ReminderOptions) => Promise<boolean>;
  /** Met à jour le widget d'écran d'accueil. Absent sur le web. */
  updateWidget?: (summary: WidgetSummary) => Promise<void>;
  /** Propose d'ajouter le widget ; faux si le téléphone ne sait pas le faire depuis l'appli. */
  pinWidget?: () => Promise<boolean>;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const webPlatform: Platform = {
  native: false,
  async saveFile(name, text) {
    download(name, new Blob([text], { type: 'application/json' }));
  },
  async shareImage(name, image, text) {
    const file = new File([image], name, { type: image.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (error) {
        // Partage annulé par le joueur : rien d'autre à faire.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    download(name, image);
  },
  async shareLink(text, url) {
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      }
    }
    return (await copyText(`${text}
${url}`)) ? 'copied' : 'failed';
  },
};

let current: Platform = webPlatform;

export function setPlatform(platform: Platform) {
  current = platform;
}

export function platform(): Platform {
  return current;
}
