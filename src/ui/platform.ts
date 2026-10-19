/**
 * Ce qui diffère entre le navigateur et l'appli Android : enregistrement de fichiers et rappel quotidien.
 * La version web est installée par défaut ; l'APK installe la sienne au démarrage.
 */
export interface Platform {
  native: boolean;
  /** Propose le fichier à l'utilisateur (téléchargement ou partage). */
  saveFile(name: string, text: string): Promise<void>;
  /** Programme (heure « HH:MM ») ou annule (null) la notification quotidienne. Absent sur le web. */
  scheduleReminder?: (time: string | null) => Promise<boolean>;
}

const webPlatform: Platform = {
  native: false,
  async saveFile(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

let current: Platform = webPlatform;

export function setPlatform(platform: Platform) {
  current = platform;
}

export function platform(): Platform {
  return current;
}
