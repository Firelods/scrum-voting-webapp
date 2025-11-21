# Scrum Vote - Jira Bridge

Extension Chrome pour connecter l'application Scrum Vote avec Jira, en contournant les restrictions CORS.

## Installation

### Mode Développeur (pour tester)

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **Mode développeur** (toggle en haut à droite)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `chrome-extension`
5. L'extension devrait apparaître dans la liste

### Configuration

1. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
2. Entrez l'URL de votre Jira : `https://jira.urssaf.recouv`
3. Sélectionnez le champ Story Points approprié
4. Cliquez sur **Sauvegarder**

### Prérequis

- Être connecté à Jira dans Chrome (session active)
- L'extension utilise vos cookies de session pour l'authentification

## Fonctionnalités

- ✅ Récupération d'issues Jira
- ✅ Lecture des Story Points
- ✅ Mise à jour des Story Points
- ✅ Recherche JQL
- ✅ Extraction automatique des clés d'issues

## Architecture

```
chrome-extension/
├── manifest.json       # Configuration Manifest V3
├── background.js       # Service Worker (API Jira)
├── content/
│   └── content.js     # Script injecté dans la webapp
├── popup/
│   ├── popup.html     # Interface de configuration
│   ├── popup.css      # Styles
│   └── popup.js       # Logique du popup
└── icons/             # Icônes de l'extension
```

## Communication avec la Webapp

L'extension communique avec Scrum Vote via `window.postMessage`.

### Depuis la webapp (TypeScript)

```typescript
import { JiraBridge, isExtensionInstalled, waitForExtension } from '@/lib/jira-bridge';

// Vérifier si l'extension est installée
if (isExtensionInstalled()) {
  // Récupérer une issue
  const issue = await JiraBridge.getIssue('PROJ-1234');

  // Mettre à jour les Story Points
  await JiraBridge.updateStoryPoints('PROJ-1234', 5);

  // Vérifier la connexion
  const status = await JiraBridge.checkConnection();
  if (status.connected) {
    console.log(`Connecté en tant que ${status.user.displayName}`);
  }
}
```

### Messages supportés

| Action | Payload | Description |
|--------|---------|-------------|
| `checkConnection` | - | Vérifie la connexion à Jira |
| `getConfig` | - | Récupère la config de l'extension |
| `getIssue` | `{ issueKey }` | Récupère une issue |
| `getIssues` | `{ issueKeys[] }` | Récupère plusieurs issues |
| `updateStoryPoints` | `{ issueKey, storyPoints }` | Met à jour les SP |
| `getStoryPoints` | `{ issueKey }` | Récupère les SP |
| `searchIssues` | `{ jql, maxResults }` | Recherche JQL |
| `extractIssueKey` | `{ input }` | Extrait la clé d'issue |
| `ping` | - | Vérifie que l'extension répond |

## Développement

### Modifier l'extension

1. Faites vos modifications dans les fichiers source
2. Allez sur `chrome://extensions/`
3. Cliquez sur le bouton **Recharger** de l'extension

### Debug

- **Service Worker** : Cliquez sur "Inspecter les vues : service worker"
- **Popup** : Clic droit sur le popup > Inspecter
- **Content Script** : Console de la page web (filtrer par `[Jira Bridge]`)

## API Jira

L'extension utilise l'API REST Jira v2 :
- `GET /rest/api/2/myself` - Info utilisateur
- `GET /rest/api/2/issue/{key}` - Récupérer une issue
- `PUT /rest/api/2/issue/{key}` - Mettre à jour une issue
- `GET /rest/api/2/search` - Recherche JQL
- `GET /rest/api/2/field` - Liste des champs

## Permissions

L'extension requiert :
- `storage` : Sauvegarde de la configuration
- `cookies` : Accès aux cookies Jira
- `host_permissions` : Accès à `https://jira.urssaf.recouv/*`

## Troubleshooting

### "Non connecté à Jira"
- Vérifiez que vous êtes bien connecté à Jira dans un onglet
- Vérifiez que l'URL Jira est correcte
- Rechargez l'extension

### "Story Points non mis à jour"
- Vérifiez que le champ Story Points configuré est correct
- Vérifiez que vous avez les droits d'édition sur l'issue

### L'extension ne détecte pas la webapp
- Vérifiez que la webapp tourne sur localhost
- Rechargez la page de la webapp
- Vérifiez la console pour les erreurs
