/**
 * Accès au Google Drive du joueur, limité au dossier caché de l'appli (« appDataFolder ») :
 * invisible dans son Drive, inaccessible aux autres applis. Un seul fichier, la progression.
 * Pas de serveur à nous : l'appli parle directement à l'API de Google avec le jeton du joueur.
 */

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_FILE = 'esprit-vif-progression.json';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface DriveFile {
  id: string;
  text: string;
}

export interface DriveClient {
  /** L'adresse du compte, pour l'afficher (« Connecté à … »). */
  email(): Promise<string>;
  read(): Promise<DriveFile | null>;
  /** Crée le fichier, ou le remplace s'il existe ; renvoie son identifiant. */
  write(text: string, id?: string): Promise<string>;
  remove(id: string): Promise<void>;
}

export function driveClient(token: string, fetchImpl: typeof fetch = (...args) => fetch(...args)): DriveClient {
  const call = async (url: string, init: RequestInit = {}) => {
    const response = await fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    if (!response.ok) throw new DriveError(`Drive ${response.status}`, response.status);
    return response;
  };

  return {
    async email() {
      const body = (await (await call(`${API}/about?fields=user(emailAddress)`)).json()) as { user?: { emailAddress?: string } };
      return body.user?.emailAddress ?? '';
    },

    async read() {
      const query = encodeURIComponent(`name='${DRIVE_FILE}'`);
      const list = (await (await call(`${API}/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc`)).json()) as {
        files?: { id: string }[];
      };
      const id = list.files?.[0]?.id;
      if (!id) return null;
      return { id, text: await (await call(`${API}/files/${id}?alt=media`)).text() };
    },

    async write(text, id) {
      if (id) {
        await call(`${UPLOAD}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: text });
        return id;
      }
      const boundary = `esprit-vif-${Date.now().toString(36)}`;
      const metadata = JSON.stringify({ name: DRIVE_FILE, parents: ['appDataFolder'], mimeType: 'application/json' });
      const body = [`--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', metadata, `--${boundary}`, 'Content-Type: application/json', '', text, `--${boundary}--`, ''].join('\r\n');
      const created = (await (
        await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body })
      ).json()) as { id: string };
      return created.id;
    },

    async remove(id) {
      await call(`${API}/files/${id}`, { method: 'DELETE' });
    },
  };
}
