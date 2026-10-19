import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Sur GitHub Pages, l'appli vit sous /esprit-vif/ ; dans l'APK, elle est servie à la racine.
const native = process.env.BUILD_TARGET === 'android';

export default defineConfig({
  base: native ? './' : '/esprit-vif/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
});
