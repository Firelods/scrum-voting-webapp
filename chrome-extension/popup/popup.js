/**
 * Scrum Vote - Jira Bridge
 * Popup Script
 */

// Éléments DOM
const elements = {
  // Status
  connectionStatus: document.getElementById('connection-status'),
  statusIcon: null,
  statusText: null,
  userInfo: document.getElementById('user-info'),
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),

  // Config
  jiraUrl: document.getElementById('jira-url'),
  storyPointsField: document.getElementById('story-points-field'),
  saveConfigBtn: document.getElementById('save-config'),

  // Test
  testIssueKey: document.getElementById('test-issue-key'),
  testGetIssue: document.getElementById('test-get-issue'),
  testGetSP: document.getElementById('test-get-sp'),
  testResult: document.getElementById('test-result'),
  testResultContent: document.getElementById('test-result-content'),

  // Other
  refreshConnection: document.getElementById('refresh-connection'),
  helpSection: document.getElementById('help-section'),
};

// Initialiser les références aux sous-éléments
elements.statusIcon = elements.connectionStatus.querySelector('.status-icon');
elements.statusText = elements.connectionStatus.querySelector('.status-text');

/**
 * Envoie un message au background script
 */
async function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

/**
 * Affiche un toast
 */
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/**
 * Met à jour le status de connexion
 */
function updateConnectionStatus(status) {
  elements.connectionStatus.className = 'status';

  if (status.connected) {
    elements.connectionStatus.classList.add('connected');
    elements.statusIcon.textContent = '✓';
    elements.statusText.textContent = 'Connecté à Jira';

    // Afficher les infos utilisateur
    if (status.user) {
      elements.userInfo.classList.remove('hidden');
      elements.userName.textContent = status.user.displayName;
      elements.userEmail.textContent = status.user.email || status.user.name;
      if (status.user.avatarUrl) {
        elements.userAvatar.src = status.user.avatarUrl;
      }
    }
  } else {
    elements.connectionStatus.classList.add('disconnected');
    elements.statusIcon.textContent = '✗';
    elements.statusText.textContent = status.error || 'Non connecté à Jira';
    elements.userInfo.classList.add('hidden');
  }
}

/**
 * Charge la configuration actuelle
 */
async function loadConfig() {
  const config = await sendMessage({ action: 'getConfig' });

  if (config) {
    elements.jiraUrl.value = config.jiraBaseUrl || '';
  }

  // Charger les champs disponibles si connecté
  await loadFields(config?.storyPointsField);
}

/**
 * Charge les champs disponibles depuis Jira
 */
async function loadFields(selectedField) {
  elements.storyPointsField.innerHTML = '<option value="">Chargement...</option>';

  try {
    const fields = await sendMessage({ action: 'getFields' });

    if (fields && !fields.error) {
      // Filtrer pour les champs numériques ou de type story points
      const relevantFields = fields.filter(f =>
        f.custom && (
          f.name.toLowerCase().includes('point') ||
          f.name.toLowerCase().includes('estimation') ||
          f.name.toLowerCase().includes('estimate') ||
          f.schema?.type === 'number'
        )
      );

      // Ajouter une option par défaut
      elements.storyPointsField.innerHTML = '<option value="">-- Sélectionner --</option>';

      // Ajouter les champs standards probables
      const defaultOptions = [
        { id: 'customfield_10002', name: 'Story Points (customfield_10002)' },
        { id: 'customfield_10004', name: 'Story Points (customfield_10004)' },
        { id: 'customfield_10006', name: 'Story Points (customfield_10006)' },
      ];

      defaultOptions.forEach(field => {
        const option = document.createElement('option');
        option.value = field.id;
        option.textContent = field.name;
        if (selectedField === field.id) option.selected = true;
        elements.storyPointsField.appendChild(option);
      });

      // Ajouter un séparateur
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '── Champs détectés ──';
      elements.storyPointsField.appendChild(separator);

      // Ajouter les champs détectés
      relevantFields.forEach(field => {
        const option = document.createElement('option');
        option.value = field.id;
        option.textContent = `${field.name} (${field.id})`;
        if (selectedField === field.id) option.selected = true;
        elements.storyPointsField.appendChild(option);
      });
    } else {
      elements.storyPointsField.innerHTML = '<option value="">Connexion requise</option>';
    }
  } catch (error) {
    console.error('Error loading fields:', error);
    elements.storyPointsField.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

/**
 * Sauvegarde la configuration
 */
async function saveConfig() {
  const config = {
    jiraBaseUrl: elements.jiraUrl.value.trim().replace(/\/$/, ''), // Enlever le slash final
    storyPointsField: elements.storyPointsField.value,
  };

  if (!config.jiraBaseUrl) {
    showToast('Veuillez entrer une URL Jira', 'error');
    return;
  }

  elements.saveConfigBtn.disabled = true;
  elements.saveConfigBtn.textContent = 'Sauvegarde...';

  try {
    await sendMessage({ action: 'saveConfig', config });
    showToast('Configuration sauvegardée', 'success');

    // Rafraîchir la connexion avec la nouvelle URL
    await checkConnection();
  } catch (error) {
    showToast('Erreur lors de la sauvegarde', 'error');
  } finally {
    elements.saveConfigBtn.disabled = false;
    elements.saveConfigBtn.textContent = 'Sauvegarder';
  }
}

/**
 * Vérifie la connexion à Jira
 */
async function checkConnection() {
  elements.connectionStatus.className = 'status loading';
  elements.statusIcon.textContent = '⏳';
  elements.statusText.textContent = 'Vérification de la connexion...';
  elements.userInfo.classList.add('hidden');

  const status = await sendMessage({ action: 'checkConnection' });
  updateConnectionStatus(status);

  // Recharger les champs si connecté
  if (status.connected) {
    const config = await sendMessage({ action: 'getConfig' });
    await loadFields(config?.storyPointsField);
  }
}

/**
 * Teste la récupération d'une issue
 */
async function testGetIssue() {
  const issueKey = elements.testIssueKey.value.trim().toUpperCase();
  if (!issueKey) {
    showToast('Veuillez entrer une clé d\'issue', 'error');
    return;
  }

  elements.testGetIssue.disabled = true;
  elements.testResult.classList.remove('hidden', 'error');
  elements.testResultContent.textContent = 'Chargement...';

  try {
    const result = await sendMessage({ action: 'getIssue', issueKey });

    if (result.error) {
      elements.testResult.classList.add('error');
      elements.testResultContent.textContent = `Erreur: ${result.error}`;
    } else {
      elements.testResultContent.textContent = JSON.stringify({
        key: result.key,
        summary: result.fields?.summary,
        status: result.fields?.status?.name,
        type: result.fields?.issuetype?.name,
        storyPoints: result.fields?.customfield_10002 || result.fields?.customfield_10004,
      }, null, 2);
    }
  } catch (error) {
    elements.testResult.classList.add('error');
    elements.testResultContent.textContent = `Erreur: ${error.message}`;
  } finally {
    elements.testGetIssue.disabled = false;
  }
}

/**
 * Teste la récupération des Story Points
 */
async function testGetStoryPoints() {
  const issueKey = elements.testIssueKey.value.trim().toUpperCase();
  if (!issueKey) {
    showToast('Veuillez entrer une clé d\'issue', 'error');
    return;
  }

  elements.testGetSP.disabled = true;
  elements.testResult.classList.remove('hidden', 'error');
  elements.testResultContent.textContent = 'Chargement...';

  try {
    const result = await sendMessage({ action: 'getStoryPoints', issueKey });

    if (result.error) {
      elements.testResult.classList.add('error');
      elements.testResultContent.textContent = `Erreur: ${result.error}`;
    } else {
      elements.testResultContent.textContent = JSON.stringify({
        issueKey,
        storyPoints: result.storyPoints,
      }, null, 2);
    }
  } catch (error) {
    elements.testResult.classList.add('error');
    elements.testResultContent.textContent = `Erreur: ${error.message}`;
  } finally {
    elements.testGetSP.disabled = false;
  }
}

/**
 * Toggle le collapse de la section aide
 */
function toggleHelp() {
  elements.helpSection.classList.toggle('collapsed');
}

// Event listeners
elements.saveConfigBtn.addEventListener('click', saveConfig);
elements.testGetIssue.addEventListener('click', testGetIssue);
elements.testGetSP.addEventListener('click', testGetStoryPoints);
elements.refreshConnection.addEventListener('click', (e) => {
  e.preventDefault();
  checkConnection();
});
elements.helpSection.querySelector('.collapsible-header').addEventListener('click', toggleHelp);

// Enter key pour le test
elements.testIssueKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') testGetIssue();
});

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  // Charger la config d'abord
  await loadConfig();
  // Puis vérifier la connexion
  await checkConnection();
  // Collapse la section aide par défaut
  elements.helpSection.classList.add('collapsed');
});
