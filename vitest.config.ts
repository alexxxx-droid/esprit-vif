import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { i18nPlugin } from './scripts/i18n-plugin.ts';

export default defineConfig({
  plugins: [i18nPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
