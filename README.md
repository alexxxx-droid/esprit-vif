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

## Installer l’appli (PWA)

Esprit Vif s’installe depuis le navigateur comme une vraie application, puis fonctionne
**hors ligne** : tout est gardé sur l’appareil après la première visite. Quand une nouvelle
version est publiée, une bannière propose de mettre à jour (jamais en pleine partie).

### Sur Android

1. Ouvre https://alexxxx-droid.github.io/esprit-vif/ dans **Chrome**.
2. Touche **Installer** sur la carte de l’accueil, ou ouvre le menu **⋮** →
   **Ajouter à l’écran d’accueil** → **Installer**.
3. L’icône Esprit Vif rejoint tes autres applis ; elle s’ouvre en plein écran.

### Sur Windows

1. Ouvre la même adresse dans **Edge** ou **Chrome**.
2. Clique sur l’icône d’installation à droite de la barre d’adresse ; dans Edge, on la trouve
   aussi dans le menu **…** → **Applications** → **Installer Esprit Vif**.
3. L’appli s’ouvre dans sa propre fenêtre et apparaît dans le menu Démarrer.

Le bouton **Installer Esprit Vif sur cet appareil** apparaît aussi dans les Réglages quand le
navigateur le permet.

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
