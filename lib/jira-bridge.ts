/**
 * Jira Bridge Client Library
 *
 * Cette bibliothèque permet à l'application Scrum Vote de communiquer
 * avec l'extension Chrome "Scrum Vote - Jira Bridge" pour interagir avec Jira.
 */

export interface JiraBridgeConfig {
  jiraBaseUrl: string;
  storyPointsField: string;
}

export interface JiraUser {
  name: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface JiraConnectionStatus {
  connected: boolean;
  user?: JiraUser;
  error?: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      avatarUrls: Record<string, string>;
    };
    [key: string]: unknown;
  };
}

// Timeout pour les requêtes (ms)
const REQUEST_TIMEOUT = 10000;

// ID unique pour les requêtes
let requestIdCounter = 0;

// Map des requêtes en attente
const pendingRequests = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: Error) => void }
>();

/**
 * Vérifie si l'extension Jira Bridge est installée
 */
export function isExtensionInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // Vérifier sur body ET html (documentElement)
  const onBody = document.body?.hasAttribute('data-jira-bridge-installed') ?? false;
  const onHtml = document.documentElement?.hasAttribute('data-jira-bridge-installed') ?? false;
  return onBody || onHtml;
}

/**
 * Attend que l'extension soit prête
 */
export function waitForExtension(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isExtensionInstalled()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      if (isExtensionInstalled()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);

    // Aussi écouter l'événement custom
    const handler = () => {
      clearInterval(checkInterval);
      window.removeEventListener('jira-bridge-ready', handler);
      resolve(true);
    };
    window.addEventListener('jira-bridge-ready', handler);
  });
}

/**
 * Initialise les listeners pour les réponses
 */
function initializeMessageListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const { type, requestId, success, data, error } = event.data || {};

    if (type !== 'SCRUM_VOTE_JIRA_RESPONSE') return;

    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    pendingRequests.delete(requestId);

    if (success) {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown error'));
    }
  });
}

// Initialiser le listener au chargement du module
if (typeof window !== 'undefined') {
  initializeMessageListener();
}

/**
 * Envoie une requête à l'extension
 */
async function sendRequest<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!isExtensionInstalled()) {
    throw new Error('Jira Bridge extension is not installed');
  }

  const requestId = `req_${++requestIdCounter}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    // Timeout
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value as T);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    window.postMessage(
      {
        type: 'SCRUM_VOTE_JIRA_REQUEST',
        action,
        payload,
        requestId,
      },
      '*'
    );
  });
}

/**
 * API Jira Bridge
 */
export const JiraBridge = {
  /**
   * Vérifie la connexion à Jira
   */
  async checkConnection(): Promise<JiraConnectionStatus> {
    return sendRequest<JiraConnectionStatus>('checkConnection');
  },

  /**
   * Récupère la configuration de l'extension
   */
  async getConfig(): Promise<JiraBridgeConfig> {
    return sendRequest<JiraBridgeConfig>('getConfig');
  },

  /**
   * Récupère une issue Jira
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    return sendRequest<JiraIssue>('getIssue', { issueKey });
  },

  /**
   * Récupère plusieurs issues
   */
  async getIssues(issueKeys: string[]): Promise<JiraIssue[]> {
    return sendRequest<JiraIssue[]>('getIssues', { issueKeys });
  },

  /**
   * Met à jour les Story Points d'une issue
   */
  async updateStoryPoints(issueKey: string, storyPoints: number): Promise<{ success: boolean }> {
    return sendRequest<{ success: boolean }>('updateStoryPoints', { issueKey, storyPoints });
  },

  /**
   * Récupère les Story Points d'une issue
   */
  async getStoryPoints(issueKey: string): Promise<{ storyPoints: number | null }> {
    return sendRequest<{ storyPoints: number | null }>('getStoryPoints', { issueKey });
  },

  /**
   * Recherche des issues avec JQL
   */
  async searchIssues(jql: string, maxResults = 50): Promise<JiraIssue[]> {
    return sendRequest<JiraIssue[]>('searchIssues', { jql, maxResults });
  },

  /**
   * Extrait la clé d'issue d'un texte
   */
  async extractIssueKey(input: string): Promise<{ issueKey: string | null }> {
    return sendRequest<{ issueKey: string | null }>('extractIssueKey', { input });
  },

  /**
   * Ping pour vérifier que l'extension répond
   */
  async ping(): Promise<{ success: boolean; message: string }> {
    return sendRequest<{ success: boolean; message: string }>('ping');
  },
};

/**
 * Extrait la clé Jira d'un titre de story ou d'une URL
 * Pattern: PROJ-1234
 */
export function extractJiraKeyFromText(text: string): string | null {
  const match = text.match(/([A-Z][A-Z0-9]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Construit l'URL Jira à partir d'une clé d'issue
 */
export function buildJiraUrl(baseUrl: string, issueKey: string): string {
  return `${baseUrl.replace(/\/$/, '')}/browse/${issueKey}`;
}

export default JiraBridge;
