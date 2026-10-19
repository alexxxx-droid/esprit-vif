import type { CapacitorConfig } from '@capacitor/cli';

// Emballage Android : le même site, servi depuis l'APK (npm run build:android).
const config: CapacitorConfig = {
  appId: 'io.github.alexxxxdroid.espritvif',
  appName: 'Esprit Vif',
  webDir: 'dist',
  backgroundColor: '#f5f2ec',
  plugins: {
    SystemBars: {
      // L'appli gère elle-même les marges avec env(safe-area-inset-*) et viewport-fit=cover.
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_spark',
      iconColor: '#4B39EF',
    },
  },
};

export default config;
