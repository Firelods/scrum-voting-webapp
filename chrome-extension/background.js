/**
 * Scrum Vote - Jira Bridge
 * Background Service Worker
 *
 * Ce service worker gère toutes les communications avec l'API Jira
 * en utilisant les cookies de session de l'utilisateur pour l'authentification.
 */

// Configuration par défaut
const DEFAULT_CONFIG = {
  jiraBaseUrl: 'https://jira.example.com',
  storyPointsField: 'customfield_10002', // Champ Story Points standard Jira
};

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
 * Fait une requête vers l'API Jira avec les credentials (cookies)
 */
async function jiraFetch(endpoint, options = {}) {
  const config = await getConfig();
  const url = `${config.jiraBaseUrl}${endpoint}`;

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error (${response.status}): ${errorText}`);
    }

    // Certaines requêtes ne retournent pas de JSON (comme les PUT)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { success: true, status: response.status };
  } catch (error) {
    console.error('Jira fetch error:', error);
    throw error;
  }
}

/**
 * Récupère les informations d'une issue Jira
 */
async function getIssue(issueKey) {
  return await jiraFetch(`/rest/api/2/issue/${issueKey}`);
}

/**
 * Récupère les informations de plusieurs issues
 */
async function getIssues(issueKeys) {
  const jql = `key in (${issueKeys.join(',')})`;
  const result = await jiraFetch(`/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100`);
  return result.issues || [];
}

/**
 * Met à jour les Story Points d'une issue
 */
async function updateStoryPoints(issueKey, storyPoints) {
  const config = await getConfig();
  const fieldId = config.storyPointsField;

  // Les story points peuvent être un nombre ou une string selon la config Jira
  const payload = {
    fields: {
      [fieldId]: typeof storyPoints === 'string' ? parseFloat(storyPoints) : storyPoints
    }
  };

  return await jiraFetch(`/rest/api/2/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Récupère les story points actuels d'une issue
 */
async function getStoryPoints(issueKey) {
  const config = await getConfig();
  const issue = await getIssue(issueKey);
  return issue.fields?.[config.storyPointsField] || null;
}

/**
 * Recherche des issues avec JQL
 */
async function searchIssues(jql, maxResults = 50) {
  const result = await jiraFetch(
    `/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
  );
  return result.issues || [];
}

/**
 * Vérifie la connexion à Jira
 */
async function checkConnection() {
  try {
    const result = await jiraFetch('/rest/api/2/myself');
    return {
      connected: true,
      user: {
        name: result.name,
        displayName: result.displayName,
        email: result.emailAddress,
        avatarUrl: result.avatarUrls?.['48x48'],
      }
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Récupère les métadonnées des champs pour trouver le champ Story Points
 */
async function getFields() {
  const fields = await jiraFetch('/rest/api/2/field');
  return fields.map(f => ({
    id: f.id,
    name: f.name,
    custom: f.custom,
    schema: f.schema,
  }));
}

/**
 * Récupère les projets disponibles
 */
async function getProjects() {
  const projects = await jiraFetch('/rest/api/2/project');
  return projects.map(p => ({
    key: p.key,
    name: p.name,
    id: p.id,
  }));
}

/**
 * Récupère les sprints actifs d'un board
 */
async function getActiveSprints(boardId) {
  try {
    const result = await jiraFetch(`/rest/agile/1.0/board/${boardId}/sprint?state=active`);
    return result.values || [];
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return [];
  }
}

/**
 * Récupère les issues d'un sprint
 */
async function getSprintIssues(sprintId, maxResults = 100) {
  try {
    const result = await jiraFetch(
      `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=${maxResults}`
    );
    return result.issues || [];
  } catch (error) {
    console.error('Error fetching sprint issues:', error);
    return [];
  }
}

/**
 * Extrait la clé d'issue d'une URL Jira ou d'un texte
 */
function extractIssueKey(input) {
  // Pattern pour extraire une clé Jira (ex: PROJ-1234)
  const match = input.match(/([A-Z][A-Z0-9]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

// Écoute les messages venant du content script ou du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  const handleRequest = async () => {
    try {
      switch (request.action) {
        case 'checkConnection':
          return await checkConnection();

        case 'getConfig':
          return await getConfig();

        case 'saveConfig':
          await saveConfig(request.config);
          return { success: true };

        case 'getIssue':
          return await getIssue(request.issueKey);

        case 'getIssues':
          return await getIssues(request.issueKeys);

        case 'updateStoryPoints':
          await updateStoryPoints(request.issueKey, request.storyPoints);
          return { success: true };

        case 'getStoryPoints':
          return { storyPoints: await getStoryPoints(request.issueKey) };

        case 'searchIssues':
          return await searchIssues(request.jql, request.maxResults);

        case 'getFields':
          return await getFields();

        case 'getProjects':
          return await getProjects();

        case 'getActiveSprints':
          return await getActiveSprints(request.boardId);

        case 'getSprintIssues':
          return await getSprintIssues(request.sprintId, request.maxResults);

        case 'extractIssueKey':
          return { issueKey: extractIssueKey(request.input) };

        case 'ping':
          return { success: true, message: 'Scrum Vote Jira Bridge is running!' };

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return { error: error.message };
    }
  };

  // Gérer la requête de manière asynchrone
  handleRequest().then(sendResponse);

  // Return true pour indiquer qu'on enverra la réponse de manière asynchrone
  return true;
});

// Log au démarrage
console.log('Scrum Vote - Jira Bridge service worker started');
