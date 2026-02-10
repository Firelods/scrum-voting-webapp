/**
 * Scrum Vote - Jira Bridge
 * Content Script injecté dans les pages Jira
 *
 * Ce script s'exécute dans le contexte de la page Jira,
 * ce qui lui permet de faire des requêtes API sans problème de certificat
 * (l'utilisateur a déjà accepté le certificat pour accéder à Jira).
 */

// Debug mode - check localStorage
let debugMode = false;
try {
  debugMode = localStorage.getItem('jira-bridge-debug') === 'true';
} catch (e) {
  // localStorage might not be available
}

function debugLog(...args) {
  if (debugMode) {
    console.log('[Jira Bridge]', ...args);
  }
}

function debugError(...args) {
  if (debugMode) {
    console.error('[Jira Bridge]', ...args);
  }
}

debugLog('Content script loaded on Jira page');

/**
 * Fait une requête vers l'API Jira
 * Comme on est sur la page Jira, les cookies sont automatiquement inclus
 */
async function jiraFetch(endpoint, options = {}) {
  const baseUrl = window.location.origin;
  const url = `${baseUrl}${endpoint}`;

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

    // 204 No Content - pas de body à parser
    if (response.status === 204) {
      return { success: true, status: 204 };
    }

    // Vérifier s'il y a du contenu à parser
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    // Si pas de contenu ou content-length = 0, retourner success
    if (contentLength === '0' || contentLength === null) {
      // Essayer de lire le texte pour voir s'il y a quelque chose
      const text = await response.text();
      if (!text || text.trim() === '') {
        return { success: true, status: response.status };
      }
      // S'il y a du texte et que c'est du JSON, le parser
      if (contentType && contentType.includes('application/json')) {
        try {
          return JSON.parse(text);
        } catch {
          return { success: true, status: response.status, text };
        }
      }
      return { success: true, status: response.status, text };
    }

    // Parser le JSON si c'est le bon content-type
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return { success: true, status: response.status };
  } catch (error) {
    debugError('Fetch error:', error);
    throw error;
  }
}

/**
 * Gestionnaires d'actions Jira
 */
const JiraActions = {
  async checkConnection() {
    const result = await jiraFetch('/rest/api/2/myself');
    return {
      connected: true,
      user: {
        name: result.name,
        displayName: result.displayName,
        email: result.emailAddress,
        avatarUrl: result.avatarUrls?.['48x48'],
      },
      jiraUrl: window.location.origin,
    };
  },

  async getIssue(issueKey) {
    return await jiraFetch(`/rest/api/2/issue/${issueKey}`);
  },

  async getIssues(issueKeys) {
    const jql = `key in (${issueKeys.join(',')})`;
    const result = await jiraFetch(`/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100`);
    return result.issues || [];
  },

  async updateStoryPoints(issueKey, storyPoints, fieldId) {
    const payload = {
      fields: {
        [fieldId]: typeof storyPoints === 'string' ? parseFloat(storyPoints) : storyPoints
      }
    };

    return await jiraFetch(`/rest/api/2/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getStoryPoints(issueKey, fieldId) {
    const issue = await jiraFetch(`/rest/api/2/issue/${issueKey}?fields=${fieldId}`);
    return issue.fields?.[fieldId] || null;
  },

  async searchIssues(jql, maxResults = 50) {
    const result = await jiraFetch(
      `/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
    );
    return result.issues || [];
  },

  async getFields() {
    const fields = await jiraFetch('/rest/api/2/field');
    return fields.map(f => ({
      id: f.id,
      name: f.name,
      custom: f.custom,
      schema: f.schema,
    }));
  },

  async getProjects() {
    const projects = await jiraFetch('/rest/api/2/project');
    return projects.map(p => ({
      key: p.key,
      name: p.name,
      id: p.id,
    }));
  },

  async getActiveSprints(boardId) {
    const result = await jiraFetch(`/rest/agile/1.0/board/${boardId}/sprint?state=active`);
    return result.values || [];
  },

  async getSprintIssues(sprintId, maxResults = 100) {
    const result = await jiraFetch(
      `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=${maxResults}`
    );
    return result.issues || [];
  },

  /**
   * Récupère les types d'issues disponibles pour un projet
   */
  async getIssueTypes(projectKey) {
    const project = await jiraFetch(`/rest/api/2/project/${projectKey}`);
    return project.issueTypes || [];
  },

  /**
   * Crée une sous-tâche liée à une issue parente
   */
  async createSubtask(parentKey, summary, projectKey, subtaskTypeId) {
    // Si pas de subtaskTypeId fourni, essayer de trouver le type "Sub-task"
    if (!subtaskTypeId) {
      const issueTypes = await this.getIssueTypes(projectKey);
      const subtaskType = issueTypes.find(t => t.subtask === true);
      if (subtaskType) {
        subtaskTypeId = subtaskType.id;
      } else {
        throw new Error('No subtask type found for this project');
      }
    }

    const payload = {
      fields: {
        project: { key: projectKey },
        parent: { key: parentKey },
        summary: summary,
        issuetype: { id: subtaskTypeId },
      },
    };

    debugLog('Creating subtask:', payload);

    const result = await jiraFetch('/rest/api/2/issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      key: result.key,
      id: result.id,
      self: result.self,
    };
  },

  /**
   * Crée plusieurs sous-tâches en batch
   */
  async createSubtasks(parentKey, subtasks, projectKey) {
    const results = [];
    const issueTypes = await this.getIssueTypes(projectKey);
    const subtaskType = issueTypes.find(t => t.subtask === true);

    if (!subtaskType) {
      throw new Error('No subtask type found for this project');
    }

    for (const subtask of subtasks) {
      try {
        const result = await this.createSubtask(
          parentKey,
          subtask.summary,
          projectKey,
          subtaskType.id
        );
        results.push({ success: true, ...result, summary: subtask.summary });
      } catch (error) {
        results.push({ success: false, error: error.message, summary: subtask.summary });
      }
    }

    return results;
  },

  /**
   * Récupère les sous-tâches d'une issue
   */
  async getSubtasks(issueKey) {
    const issue = await jiraFetch(`/rest/api/2/issue/${issueKey}?fields=subtasks`);
    return issue.fields?.subtasks || [];
  },
};

/**
 * Écoute les messages du background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Received message from background:', request);

  const handleRequest = async () => {
    try {
      const { action, payload } = request;

      switch (action) {
        case 'jira_checkConnection':
          return await JiraActions.checkConnection();

        case 'jira_getIssue':
          return await JiraActions.getIssue(payload.issueKey);

        case 'jira_getIssues':
          return await JiraActions.getIssues(payload.issueKeys);

        case 'jira_updateStoryPoints':
          await JiraActions.updateStoryPoints(payload.issueKey, payload.storyPoints, payload.fieldId);
          return { success: true };

        case 'jira_getStoryPoints':
          return { storyPoints: await JiraActions.getStoryPoints(payload.issueKey, payload.fieldId) };

        case 'jira_searchIssues':
          return await JiraActions.searchIssues(payload.jql, payload.maxResults);

        case 'jira_getFields':
          return await JiraActions.getFields();

        case 'jira_getProjects':
          return await JiraActions.getProjects();

        case 'jira_getActiveSprints':
          return await JiraActions.getActiveSprints(payload.boardId);

        case 'jira_getSprintIssues':
          return await JiraActions.getSprintIssues(payload.sprintId, payload.maxResults);

        case 'jira_getIssueTypes':
          return await JiraActions.getIssueTypes(payload.projectKey);

        case 'jira_createSubtask':
          return await JiraActions.createSubtask(
            payload.parentKey,
            payload.summary,
            payload.projectKey,
            payload.subtaskTypeId
          );

        case 'jira_createSubtasks':
          return await JiraActions.createSubtasks(
            payload.parentKey,
            payload.subtasks,
            payload.projectKey
          );

        case 'jira_getSubtasks':
          return await JiraActions.getSubtasks(payload.issueKey);

        case 'jira_ping':
          return {
            success: true,
            message: 'Jira content script is running!',
            url: window.location.origin,
          };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      debugError('Error handling request:', error);
      return { error: error.message };
    }
  };

  handleRequest().then(sendResponse);
  return true; // Keep the message channel open for async response
});

// Signaler au background script que le content script est prêt
chrome.runtime.sendMessage({
  action: 'jira_contentScriptReady',
  url: window.location.origin
});

debugLog('Content script ready on:', window.location.origin);
