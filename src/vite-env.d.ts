/// <reference types="vite/client" />

/** Version de l'appli, lue dans package.json au moment du build. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Identifiant OAuth « application Web » de Google (sauvegarde Drive) ; vide = fonction masquée. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** « 1 » : version de test (boutique simulée, bandeau MODE TEST), jamais pour une publication. */
  readonly VITE_BILLING_TEST?: string;
}
