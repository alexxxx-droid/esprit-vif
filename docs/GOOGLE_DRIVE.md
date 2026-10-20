# Sauvegarde Google Drive : mise en route (environ 10 minutes)

La synchronisation est écrite et testée ; il manque l'identifiant Google de l'appli, que seul le
propriétaire du compte peut créer. Tant qu'il est absent, la section « Sauvegarde Google Drive »
des réglages n'apparaît pas.

L'appli ne demande qu'un seul droit : **`drive.appdata`**, « lire et écrire ses propres données
de configuration ». Elle voit seulement son dossier caché, jamais tes fichiers. Ce droit est classé
« non sensible » par Google : pas d'audit de sécurité à passer.

## 1. Le projet

1. Ouvre <https://console.cloud.google.com>, connecté avec ton compte Google.
2. En haut, **Sélectionner un projet → Nouveau projet**, nom « Esprit Vif », **Créer**.
3. Menu **API et services → Bibliothèque** : cherche « Google Drive API », **Activer**.

## 2. L'écran d'accord

1. **API et services → Écran de consentement OAuth** (ou « Google Auth Platform »).
2. Type d'utilisateurs : **Externe**.
3. Nom de l'application : `Esprit Vif` ; adresse d'assistance : la tienne ; coordonnées du
   développeur : la tienne.
4. **Accès aux données → Ajouter des champs d'application** : coche
   `.../auth/drive.appdata`, enregistre.
5. **Audience** : tant que l'appli est « En test », ajoute ton adresse (et celles des testeurs)
   dans **Utilisateurs test**. Pour l'ouvrir à tous : **Publier l'application**.

## 3. L'identifiant du site (et de la version web)

1. **API et services → Identifiants → Créer des identifiants → ID client OAuth**.
2. Type : **Application Web**, nom « Esprit Vif web ».
3. **Origines JavaScript autorisées** : ajoute
   - `https://alexxxx-droid.github.io`
   - `http://localhost:5173`
   - `http://localhost:4173`
4. **Créer**, puis copie l'**ID client** (il finit par `.apps.googleusercontent.com`).
   Ce n'est pas un secret : il peut figurer dans le code.

## 4. L'identifiant de l'appli Android

1. **Créer des identifiants → ID client OAuth**, type **Android**.
2. Nom du package : `io.github.alexxxxdroid.espritvif`
3. Empreinte du certificat SHA-1 (celui qui signe l'APK) :

   `09:5D:5C:9A:4C:E4:72:87:9C:21:80:D0:F3:36:8E:43:76:E0:AB:69`

4. **Créer**. Rien à copier : Google reconnaît l'appli à son package et à sa signature.

> Le jour où l'appli passe par le Play Store avec la « signature d'application par Google
> Play », ajoute un second identifiant Android avec l'empreinte SHA-1 donnée par la Play Console
> (Configuration → Intégrité de l'application).

## 5. Me donner l'identifiant

Envoie-moi l'ID client **Web** de l'étape 3. Je le mets dans le fichier `.env` du projet :

```
VITE_GOOGLE_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com
```

puis je reconstruis le site et l'APK : la section « Sauvegarde Google Drive » apparaît dans les
réglages.

## Comment ça marche ensuite

- **Se connecter avec Google** (Réglages) : la première fois, Google demande ton accord.
- La progression est rangée dans le dossier caché de l'appli sur **ton** Drive. Le téléphone, la
  tablette, l'appli et le site se retrouvent : chaque appareil **fusionne** sa progression avec
  celle du Drive, sans rien perdre, même si tu as joué hors ligne des deux côtés.
- La synchronisation se fait seule : à l'ouverture, quelques secondes après chaque partie, et en
  quittant l'appli. Sur le site, si Google redemande ton accord, un « Synchroniser maintenant »
  suffit.
- **Arrêter la sauvegarde Drive** coupe le lien sur cet appareil ; la progression reste sur le
  téléphone, et la copie reste sur le Drive (supprimable depuis drive.google.com → Paramètres →
  Gérer les applications).
