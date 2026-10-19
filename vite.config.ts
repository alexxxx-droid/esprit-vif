import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Sur GitHub Pages, l'appli vit sous /esprit-vif/ ; dans l'APK, elle est servie à la racine.
const native = process.env.BUILD_TARGET === 'android';

export default defineConfig({
  base: native ? './' : '/esprit-vif/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      // Mise à jour proposée, jamais imposée : un rechargement en pleine partie serait frustrant.
      registerType: 'prompt',
      injectRegister: false,
      disable: native,
      // Les fichiers de public/ (icônes) sont déjà couverts par globPatterns.
      includeManifestIcons: false,
      manifest: {
        id: './',
        name: 'Esprit Vif',
        short_name: 'Esprit Vif',
        description: 'Quelques minutes par jour pour garder l’esprit vif : test du jour, huit mini-jeux, âge cérébral.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f2ec',
        theme_color: '#f5f2ec',
        categories: ['education', 'games', 'health'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Entraînement', url: './#/entrainement', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Progrès', url: './#/progres', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Polices : seuls les jeux de caractères utiles au français sont gardés hors ligne.
        globIgnores: ['**/*-vietnamese-*', '**/*-cyrillic*', '**/*-greek*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
