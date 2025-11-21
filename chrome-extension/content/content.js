/**
 * Scrum Vote - Jira Bridge
 * Content Script
 *
 * Ce script est injecté dans la page Scrum Vote et fait le pont
 * entre l'application web et le background script de l'extension.
 */

const EXTENSION_ID = 'scrum-vote-jira-bridge';

/**
 * Envoie un message au background script
 */
async function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * API exposée à la page web via window.postMessage
 */
const JiraBridgeAPI = {
  /**
   * Vérifie si l'extension est installée et connectée
   */
  async checkConnection() {
    return await sendToBackground({ action: 'checkConnection' });
  },

  /**
   * Récupère les informations d'une issue Jira
   */
  async getIssue(issueKey) {
    return await sendToBackground({ action: 'getIssue', issueKey });
  },

  /**
   * Récupère plusieurs issues
   */
  async getIssues(issueKeys) {
    return await sendToBackground({ action: 'getIssues', issueKeys });
  },

  /**
   * Met à jour les Story Points d'une issue
   */
  async updateStoryPoints(issueKey, storyPoints) {
    return await sendToBackground({ action: 'updateStoryPoints', issueKey, storyPoints });
  },

  /**
   * Récupère les Story Points d'une issue
   */
  async getStoryPoints(issueKey) {
    return await sendToBackground({ action: 'getStoryPoints', issueKey });
  },

  /**
   * Recherche des issues avec JQL
   */
  async searchIssues(jql, maxResults = 50) {
    return await sendToBackground({ action: 'searchIssues', jql, maxResults });
  },

  /**
   * Récupère la configuration de l'extension
   */
  async getConfig() {
    return await sendToBackground({ action: 'getConfig' });
  },

  /**
   * Extrait la clé d'issue d'un texte ou URL
   */
  async extractIssueKey(input) {
    return await sendToBackground({ action: 'extractIssueKey', input });
  },

  /**
   * Ping pour vérifier que l'extension est active
   */
  async ping() {
    return await sendToBackground({ action: 'ping' });
  }
};

/**
 * Écoute les messages de la page web
 */
window.addEventListener('message', async (event) => {
  // Vérifier l'origine
  if (event.source !== window) return;

  const { type, action, payload, requestId } = event.data || {};

  // Ne traiter que les messages destinés à l'extension
  if (type !== 'SCRUM_VOTE_JIRA_REQUEST') return;

  console.log('[Jira Bridge] Received request:', action, payload);

  try {
    let result;

    switch (action) {
      case 'checkConnection':
        result = await JiraBridgeAPI.checkConnection();
        break;

      case 'getIssue':
        result = await JiraBridgeAPI.getIssue(payload.issueKey);
        break;

      case 'getIssues':
        result = await JiraBridgeAPI.getIssues(payload.issueKeys);
        break;

      case 'updateStoryPoints':
        result = await JiraBridgeAPI.updateStoryPoints(payload.issueKey, payload.storyPoints);
        break;

      case 'getStoryPoints':
        result = await JiraBridgeAPI.getStoryPoints(payload.issueKey);
        break;

      case 'searchIssues':
        result = await JiraBridgeAPI.searchIssues(payload.jql, payload.maxResults);
        break;

      case 'getConfig':
        result = await JiraBridgeAPI.getConfig();
        break;

      case 'extractIssueKey':
        result = await JiraBridgeAPI.extractIssueKey(payload.input);
        break;

      case 'ping':
        result = await JiraBridgeAPI.ping();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Envoyer la réponse
    window.postMessage({
      type: 'SCRUM_VOTE_JIRA_RESPONSE',
      requestId,
      success: true,
      data: result,
    }, '*');

  } catch (error) {
    console.error('[Jira Bridge] Error:', error);

    window.postMessage({
      type: 'SCRUM_VOTE_JIRA_RESPONSE',
      requestId,
      success: false,
      error: error.message,
    }, '*');
  }
});

/**
 * Signale que l'extension est installée
 */
function signalExtensionInstalled() {
  console.log('[Jira Bridge] Signaling extension installed...');
  console.log('[Jira Bridge] document.body exists:', !!document.body);
  console.log('[Jira Bridge] Current URL:', window.location.href);

  if (!document.body) {
    console.log('[Jira Bridge] No body yet, retrying in 100ms...');
    setTimeout(signalExtensionInstalled, 100);
    return;
  }

  // Ajouter un attribut au body pour que la page puisse détecter l'extension
  document.body.setAttribute('data-jira-bridge-installed', 'true');
  console.log('[Jira Bridge] Attribute set on body');

  // Aussi sur documentElement (html) au cas où
  document.documentElement.setAttribute('data-jira-bridge-installed', 'true');

  // Envoyer un événement custom
  window.dispatchEvent(new CustomEvent('jira-bridge-ready', {
    detail: { version: '1.1.0' }
  }));

  // Envoyer aussi un message
  window.postMessage({
    type: 'SCRUM_VOTE_JIRA_READY',
    version: '1.1.0',
  }, '*');

  console.log('[Jira Bridge] Extension ready and signaled to page');
}

// Signaler l'installation au chargement
console.log('[Jira Bridge] Content script starting, readyState:', document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', signalExtensionInstalled);
} else {
  signalExtensionInstalled();
}

// Re-signaler périodiquement (au cas où la page se recharge partiellement avec Next.js)
setInterval(() => {
  if (document.body && !document.body.hasAttribute('data-jira-bridge-installed')) {
    console.log('[Jira Bridge] Re-signaling (attribute was removed)');
    signalExtensionInstalled();
  }
}, 1000);

console.log('[Jira Bridge] Content script loaded on:', window.location.href);
