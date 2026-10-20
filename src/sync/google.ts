import { platform } from '../ui/platform';
import { DRIVE_SCOPE } from './drive';

/**
 * Jeton d'accès Google, limité au dossier caché de l'appli sur le Drive. Sur le site : le
 * bouton officiel de Google (Google Identity Services, chargé seulement si le joueur s'en sert).
 * Dans l'appli Android : un module natif (Google interdit sa page de connexion dans une vue web).
 */

/** Identifiant OAuth « application Web » (voir docs/GOOGLE_DRIVE.md) ; vide : la fonction est masquée. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function cloudConfigured(): boolean {
  return GOOGLE_CLIENT_ID !== '';
}

/** Il faut l'accord du joueur (première connexion, ou jeton expiré sur le site) : on attend un geste de sa part. */
export class NeedsConsent extends Error {}

let cached: { token: string; until: number } | null = null;

export async function googleToken(interactive: boolean): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const native = platform().googleToken;
  const { token, expiresIn } = native ? await native(interactive) : await webToken(interactive);
  cached = { token, until: Date.now() + expiresIn * 1000 };
  return token;
}

export function forgetToken() {
  cached = null;
}

// ---------- Google Identity Services (site web) ----------

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface GoogleOAuth {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }): { requestAccessToken(options?: { prompt?: string }): void };
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth } };
  }
}

let loading: Promise<GoogleOAuth> | null = null;

function loadGis(): Promise<GoogleOAuth> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error('Google indisponible')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Google indisponible'));
    };
    document.head.append(script);
  });
  return loading;
}

async function webToken(interactive: boolean): Promise<{ token: string; expiresIn: number }> {
  const oauth = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) =>
        response.access_token ? resolve({ token: response.access_token, expiresIn: response.expires_in ?? 3600 }) : reject(new NeedsConsent(response.error ?? 'refus')),
      error_callback: (error) => reject(new NeedsConsent(error.type ?? 'fenêtre fermée')),
    });
    // Sans geste du joueur, pas de fenêtre : si l'accord manque, la synchro attend un « Synchroniser ».
    client.requestAccessToken({ prompt: interactive ? '' : 'none' });
  });
}

/** Retire l'accès donné à l'appli (site web) ; dans l'appli Android, on oublie simplement le lien. */
export async function revokeAccess() {
  const token = cached?.token;
  forgetToken();
  if (!token || platform().googleToken) return;
  const oauth = await loadGis().catch(() => null);
  oauth?.revoke(token);
}
