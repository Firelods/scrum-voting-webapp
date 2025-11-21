# Scrum Vote - Jira Bridge

Extension Chrome pour connecter l'application Scrum Vote avec Jira, en contournant les restrictions CORS et les problèmes de certificat SSL.

## Installation

### Mode Développeur (pour tester)

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **Mode développeur** (toggle en haut à droite)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `chrome-extension`
5. L'extension devrait apparaître dans la liste

### Configuration

1. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
2. Entrez l'URL de votre Jira : `https://jira.example.com`
3. Cliquez sur **Ouvrir Jira dans un nouvel onglet** (ou ouvrez-le manuellement)
4. Connectez-vous à Jira si nécessaire
5. Revenez au popup et cliquez sur **Rafraîchir connexion**
6. Sélectionnez le champ Story Points approprié
7. Cliquez sur **Sauvegarder**

### Prérequis

- **Un onglet Jira doit rester ouvert** pendant l'utilisation
- L'extension utilise cet onglet pour faire les requêtes API (contourne les problèmes de certificat SSL)

## Architecture

L'extension utilise une architecture en 3 parties :

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Scrum Vote    │────>│ Background Script│────>│  Onglet Jira    │
│   (localhost)   │     │  (coordinateur)  │     │ (content script)│
│                 │<────│                  │<────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
    content.js              background.js         jira-injected.js
```

**Pourquoi cette architecture ?**
- Le service worker ne peut pas contourner les erreurs de certificat SSL
- Le content script injecté dans la page Jira peut faire des requêtes car l'utilisateur a déjà accepté le certificat
- Cela permet de fonctionner avec des Jira internes utilisant des certificats auto-signés

## Structure des fichiers

```
chrome-extension/
├── manifest.json           # Configuration Manifest V3
├── background.js           # Service Worker (coordinateur)
├── content/
│   ├── content.js         # Injecté dans Scrum Vote (localhost)
│   └── jira-injected.js   # Injecté dans les pages Jira
├── popup/
│   ├── popup.html         # Interface de configuration
│   ├── popup.css          # Styles
│   └── popup.js           # Logique du popup
└── icons/                 # Icônes de l'extension
```

## Fonctionnalites

- Recuperation d'issues Jira
- Lecture des Story Points
- Mise a jour des Story Points
- Affichage des Story Points Jira dans Scrum Vote
- Indicateur de synchronisation (vert = synchro, orange = different)
- Recherche JQL
- Extraction automatique des cles d'issues
- Detection automatique des champs Story Points
- Mode debug optionnel pour le troubleshooting

## Utilisation depuis la Webapp

```typescript
import { JiraBridge, isExtensionInstalled, waitForExtension } from '@/lib/jira-bridge';

// Attendre que l'extension soit prête
await waitForExtension();

if (isExtensionInstalled()) {
  // Vérifier la connexion
  const status = await JiraBridge.checkConnection();
  if (status.connected) {
    console.log(`Connecté en tant que ${status.user.displayName}`);
  }

  // Récupérer une issue
  const issue = await JiraBridge.getIssue('PROJECT-6484');

  // Mettre à jour les Story Points
  await JiraBridge.updateStoryPoints('PROJECT-6484', 5);

  // Rechercher des issues
  const issues = await JiraBridge.searchIssues('project = PROJECT AND sprint in openSprints()');
}
```

## Messages supportés

| Action | Payload | Description |
|--------|---------|-------------|
| `checkConnection` | - | Vérifie la connexion à Jira |
| `getConfig` | - | Récupère la config de l'extension |
| `getIssue` | `{ issueKey }` | Récupère une issue |
| `getIssues` | `{ issueKeys[] }` | Récupère plusieurs issues |
| `updateStoryPoints` | `{ issueKey, storyPoints }` | Met à jour les SP |
| `getStoryPoints` | `{ issueKey }` | Récupère les SP |
| `searchIssues` | `{ jql, maxResults }` | Recherche JQL |
| `getFields` | - | Liste les champs Jira |
| `getProjects` | - | Liste les projets |
| `extractIssueKey` | `{ input }` | Extrait la clé d'issue |
| `ping` | - | Vérifie que l'extension répond |

## Développement

### Modifier l'extension

1. Faites vos modifications dans les fichiers source
2. Allez sur `chrome://extensions/`
3. Cliquez sur le bouton **Recharger** de l'extension

### Mode Debug

Les logs de debug sont desactives par defaut pour eviter d'encombrer la console en production.

**Pour activer les logs de debug:**

1. Ouvrez la console du navigateur (F12) sur la page Scrum Vote
2. Executez : `JiraBridgeDebug.enable()`
3. Rechargez la page

**Pour desactiver:**
```javascript
JiraBridgeDebug.disable()
```

**Pour verifier si le debug est actif:**
```javascript
JiraBridgeDebug.isEnabled()
```

### Acceder aux logs

- **Service Worker** : Cliquez sur "Inspecter les vues : service worker" dans chrome://extensions
- **Popup** : Clic droit sur le popup > Inspecter
- **Content Script Jira** : Console de l'onglet Jira (filtrer par `[Jira Bridge]`)
- **Content Script Webapp** : Console de localhost (filtrer par `[Jira Bridge]`)

## Troubleshooting

### "Aucun onglet Jira ouvert"
- Ouvrez une page Jira (n'importe laquelle) dans un onglet
- Attendez que la page soit chargée
- Cliquez sur "Rafraîchir connexion" dans le popup

### "Non connecté à Jira"
- Vérifiez que vous êtes connecté à Jira dans l'onglet ouvert
- Vérifiez que l'URL Jira configurée est correcte

### "Story Points non mis à jour"
- Vérifiez que le champ Story Points configuré est correct
- Vérifiez que vous avez les droits d'édition sur l'issue

### L'extension ne détecte pas la webapp
- Vérifiez que la webapp tourne sur localhost
- Rechargez la page de la webapp
- Vérifiez la console pour les erreurs

## API Jira utilisées

- `GET /rest/api/2/myself` - Info utilisateur connecté
- `GET /rest/api/2/issue/{key}` - Récupérer une issue
- `PUT /rest/api/2/issue/{key}` - Mettre à jour une issue
- `GET /rest/api/2/search` - Recherche JQL
- `GET /rest/api/2/field` - Liste des champs
- `GET /rest/api/2/project` - Liste des projets

## Permissions

L'extension requiert :
- `storage` : Sauvegarde de la configuration
- `tabs` : Trouver et communiquer avec les onglets Jira
- `scripting` : Injecter des scripts si nécessaire
- `host_permissions` : Acces a `https://jira.example.com/*` et `localhost`

## Version

**Actuelle: 1.1.0**

### Changelog

#### 1.1.0
- Ajout de l'affichage des Story Points Jira dans Scrum Vote
- Ajout de l'indicateur de synchronisation (vert = synchro, orange = different)
- Ajout du mode debug optionnel (desactive par defaut)
- Correction de la gestion des reponses 204 No Content
- Support des URLs 127.0.0.1 et vercel.app

#### 1.0.0
- Version initiale
- Upload des Story Points vers Jira
- Detection de connexion Jira
- Interface de configuration
