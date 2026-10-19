import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icônes de l'appli installée, générées une fois depuis public/favicon.svg (npm run icons).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#4b39ef' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#4b39ef' } },
  },
  images: ['public/favicon.svg'],
});
