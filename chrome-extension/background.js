/**
 * Scrum Vote - Jira Bridge
 * Background Service Worker
 *
 * Ce service worker coordonne les communications entre:
 * - La webapp Scrum Vote (via content script)
 * - Les pages Jira (via content script injecté)
 *
 * Les requêtes API Jira sont exécutées par le content script
 * injecté dans la page Jira pour éviter les problèmes de certificat.
 */

// Debug mode - stored in chrome.storage
let debugMode = false;

// Load debug mode on startup
chrome.storage.sync.get(['jiraBridgeDebug'], (result) => {
  debugMode = result.jiraBridgeDebug === true;
});

function debugLog(...args) {
  if (debugMode) {
    console.log('[Background]', ...args);
  }
}

function debugError(...args) {
  if (debugMode) {
    console.error('[Background]', ...args);
  }
}

// Configuration par défaut
const DEFAULT_CONFIG = {
  jiraBaseUrl: 'https://jira.urssaf.recouv',
  storyPointsField: 'customfield_10002',
};

// Cache des onglets Jira avec leur content script prêt
const jiraTabsReady = new Set();

// Récupérer la configuration depuis le storage
async function getConfig() {
  const result = await chrome.storage.sync.get(['jiraConfig']);
  return { ...DEFAULT_CONFIG, ...result.jiraConfig };
}

// Sauvegarder la configuration
async function saveConfig(config) {
  await chrome.storage.sync.set({ jiraConfig: config });
}

/**
 * Trouve un onglet Jira ouvert
 */
async function findJiraTab() {
  const config = await getConfig();
  const jiraUrl = config.jiraBaseUrl;

  // Chercher un onglet Jira déjà ouvert
  const tabs = await chrome.tabs.query({ url: `${jiraUrl}/*` });

  if (tabs.length > 0) {
    // Préférer un onglet dont le content script est prêt
    for (const tab of tabs) {
      if (jiraTabsReady.has(tab.id)) {
        return tab;
      }
    }
    // Sinon retourner le premier onglet trouvé
    return tabs[0];
  }

  return null;
}

/**
 * Ouvre un nouvel onglet Jira si nécessaire
 */
async function ensureJiraTab() {
  let tab = await findJiraTab();

  if (!tab) {
    const config = await getConfig();
    // Ouvrir un nouvel onglet Jira en arrière-plan
    tab = await chrome.tabs.create({
      url: config.jiraBaseUrl,
      active: false,
    });

    // Attendre que la page soit chargée
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });

    // Petit délai pour que le content script soit injecté
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return tab;
}

/**
 * Envoie une requête au content script Jira
 */
async function sendToJiraTab(action, payload = {}) {
  const tab = await ensureJiraTab();

  if (!tab) {
    throw new Error('Impossible de trouver ou créer un onglet Jira. Veuillez ouvrir Jira manuellement.');
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: `jira_${action}`,
      payload,
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    return response;
  } catch (error) {
    // Si le content script n'est pas prêt, on essaie de le réinjecter
    if (error.message.includes('Receiving end does not exist')) {
      jiraTabsReady.delete(tab.id);

      // Essayer de recharger l'onglet
      await chrome.tabs.reload(tab.id);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Réessayer
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: `jira_${action}`,
        payload,
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      return response;
    }

    throw error;
  }
}

/**
 * Extrait la clé d'issue d'une URL Jira ou d'un texte
 */
function extractIssueKey(input) {
  const match = input.match(/([A-Z][A-Z0-9]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

// Écoute les messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Received message:', request.action);

  // Si c'est un message du content script Jira signalant qu'il est prêt
  if (request.action === 'jira_contentScriptReady') {
    if (sender.tab) {
      jiraTabsReady.add(sender.tab.id);
      debugLog('Jira tab ready:', sender.tab.id, request.url);
    }
    return;
  }

  const handleRequest = async () => {
    try {
      const config = await getConfig();

      switch (request.action) {
        case 'checkConnection':
          return await sendToJiraTab('checkConnection');

        case 'getConfig':
          return config;

        case 'saveConfig':
          await saveConfig(request.config);
          return { success: true };

        case 'getIssue':
          return await sendToJiraTab('getIssue', { issueKey: request.issueKey });

        case 'getIssues':
          return await sendToJiraTab('getIssues', { issueKeys: request.issueKeys });

        case 'updateStoryPoints':
          return await sendToJiraTab('updateStoryPoints', {
            issueKey: request.issueKey,
            storyPoints: request.storyPoints,
            fieldId: config.storyPointsField,
          });

        case 'getStoryPoints':
          return await sendToJiraTab('getStoryPoints', {
            issueKey: request.issueKey,
            fieldId: config.storyPointsField,
          });

        case 'searchIssues':
          return await sendToJiraTab('searchIssues', {
            jql: request.jql,
            maxResults: request.maxResults,
          });

        case 'getFields':
          return await sendToJiraTab('getFields');

        case 'getProjects':
          return await sendToJiraTab('getProjects');

        case 'getActiveSprints':
          return await sendToJiraTab('getActiveSprints', { boardId: request.boardId });

        case 'getSprintIssues':
          return await sendToJiraTab('getSprintIssues', {
            sprintId: request.sprintId,
            maxResults: request.maxResults,
          });

        case 'extractIssueKey':
          return { issueKey: extractIssueKey(request.input) };

        case 'ping':
          return { success: true, message: 'Scrum Vote Jira Bridge is running!' };

        case 'hasJiraTab':
          const tab = await findJiraTab();
          return { hasTab: !!tab, tabId: tab?.id };

        case 'openJiraTab':
          const newTab = await ensureJiraTab();
          return { success: true, tabId: newTab.id };

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error) {
      debugError('Error:', error);
      return { error: error.message };
    }
  };

  handleRequest().then(sendResponse);
  return true;
});

// Nettoyer le cache quand un onglet est fermé
chrome.tabs.onRemoved.addListener((tabId) => {
  jiraTabsReady.delete(tabId);
});

debugLog('Scrum Vote - Jira Bridge service worker started');
