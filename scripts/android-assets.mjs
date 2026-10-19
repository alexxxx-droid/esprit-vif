// Icônes, écrans de démarrage et icône de notification de l'appli Android, tirés du logo.
// Usage : npm run icons:android (à relancer seulement si le logo change).
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const RES = 'android/app/src/main/res';
const ACCENT = '#4b39ef';
const PAPER = '#f5f2ec';
const SPARK = 'M32 10C34 22.2 41.8 30 54 32 41.8 34 34 41.8 32 54 30 41.8 22.2 34 10 32 22.2 30 30 22.2 32 10Z';

const mark = (scale) =>
  `<g transform="translate(54 54) scale(${scale}) translate(-32 -32)"><path d="${SPARK}" fill="#fff"/><circle cx="50" cy="14" r="5" fill="#ffc233"/></g>`;

/** Premier plan de l'icône adaptative : 108 × 108, le dessin tient dans la zone sûre centrale. */
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${mark(1.05)}</svg>`;
/** Icône classique (Android < 8) : carré arrondi ou rond, plein cadre. */
const legacy = (round) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${
    round ? `<circle cx="54" cy="54" r="54" fill="${ACCENT}"/>` : `<rect width="108" height="108" rx="26" fill="${ACCENT}"/>`
  }${mark(1.35)}</svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" rx="26" fill="${ACCENT}"/>${mark(1.35)}</svg>`;

const render = (svg, width, height = width) => sharp(Buffer.from(svg), { density: 600 }).resize(width, height).png().toBuffer();

for (const dir of readdirSync(RES)) {
  for (const file of readdirSync(join(RES, dir))) {
    if (!file.endsWith('.png')) continue;
    const path = join(RES, dir, file);
    const { width, height } = await sharp(path).metadata();
    let output;
    if (file === 'ic_launcher_foreground.png') output = await render(foreground, width);
    else if (file === 'ic_launcher.png') output = await render(legacy(false), width);
    else if (file === 'ic_launcher_round.png') output = await render(legacy(true), width);
    else if (file === 'splash.png') {
      const size = Math.round(Math.min(width, height) * 0.3);
      output = await sharp({ create: { width, height, channels: 4, background: PAPER } })
        .composite([{ input: await render(badge, size) }])
        .png()
        .toBuffer();
    } else continue;
    writeFileSync(path, output);
    console.log('écrit', `${dir}/${file}`, `${width}x${height}`);
  }
}

writeFileSync(
  join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#4B39EF</color>\n</resources>\n`,
);

// Petite icône des notifications : silhouette blanche (Android la teinte lui-même).
writeFileSync(
  join(RES, 'drawable/ic_stat_spark.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="64"
    android:viewportHeight="64">
    <path android:fillColor="#FFFFFFFF" android:pathData="${SPARK}" />
    <path android:fillColor="#FFFFFFFF" android:pathData="M50,9a5,5 0,1 1,0 10a5,5 0,1 1,0 -10z" />
</vector>
`,
);
console.log('écrit drawable/ic_stat_spark.xml et la couleur de fond de l’icône');
