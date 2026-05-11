# NEO-SUSU PWA — Guide d'installation

## 📱 Installer l'application sur votre téléphone

### Sur Android (Chrome)
1. Ouvrez le site dans Chrome
2. Un bandeau apparaît en bas : **"Installer NEO-SUSU"**
3. Appuyez sur **📲 Installer**
4. L'icône NEO-SUSU apparaît sur votre écran d'accueil ✅

### Sur iPhone (Safari)
1. Ouvrez le site dans **Safari** (pas Chrome)
2. Appuyez sur le bouton **⎋ Partager** en bas de l'écran
3. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**
4. Appuyez sur **Ajouter** en haut à droite ✅

---

## 🚀 Déployer sur GitHub Pages

### Structure des fichiers à uploader
```
neo-susu/
├── index.html                    ← Hub principal
├── manifest.json                 ← Config PWA ⭐
├── sw.js                         ← Service Worker ⭐
├── neo-susu-website.html
├── NEO-SUSU-App-Premium.html
├── NEO-SUSU_Presentation.html
├── NEO-SUSU_App_Presentation.html
├── NEO-SUSU_Film_Marketing.html
├── NEO-SUSU_Dossier_INPI.html
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    ├── icon-512.png
    └── screenshot-mobile.png
```

### Étapes GitHub Pages
1. Allez sur votre dépôt GitHub `neo-susu`
2. Cliquez **Add file → Upload files**
3. Glissez **TOUS** les fichiers ET le dossier `icons/`
4. Commit → Settings → Pages → main → Save
5. Votre PWA est en ligne ! 🎉

---

## ✅ Fonctionnalités PWA incluses

| Fonctionnalité | Status |
|---|---|
| Installation sur écran d'accueil | ✅ |
| Icône personnalisée (N doré) | ✅ |
| Fonctionne hors ligne | ✅ |
| Cache automatique | ✅ |
| Notifications push (préparé) | ✅ |
| Splash screen | ✅ |
| Mode plein écran (standalone) | ✅ |
| Raccourcis d'application | ✅ |
| Compatible iOS + Android | ✅ |

---

**NEO-SUSU SAS** · Paris, France · contact@neo-susu.com
