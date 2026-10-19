# Esprit Vif

Quelques minutes par jour pour garder l’esprit vif : un test du jour en trois mini-jeux,
un âge cérébral indicatif et un entraînement libre qui s’adapte à ton niveau.
Sans compte, sans publicité, sans pistage : tout reste sur ton appareil.

**Jouer :** https://alexxxx-droid.github.io/esprit-vif/

> L’âge cérébral est un indicateur ludique, pas une mesure médicale.

## Lancer en local

Il faut Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173/esprit-vif/
```

## Tester

```bash
npm test           # tests unitaires (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run check      # les trois à la suite
```

## Construire

```bash
npm run build      # vérifie les types puis produit dist/
npm run preview    # sert dist/ sur http://localhost:4173/esprit-vif/
```

Chaque `push` sur `main` relance lint, types et tests, puis publie `dist/` sur GitHub Pages
(`.github/workflows/deploy.yml`).

## Organisation du code

```
src/core/     logique pure, sans interface : générateurs, scores, âge cérébral, test du jour
src/store/    stockage local (IndexedDB) et progression, export/import JSON
src/ui/       interface React : écrans, déroulé de partie, jeux, sons et vibrations
src/styles/   jetons de design (clair/sombre) et feuilles de style
docs/         décisions de conception
```

Les choix faits là où la spécification laissait une marge sont notés dans
[`docs/DECISIONS.md`](docs/DECISIONS.md).
