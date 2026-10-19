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
