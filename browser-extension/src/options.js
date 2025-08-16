/**
 * TruthLens Options Page Script
 * Handles settings configuration and backend connection
 */

class TruthLensOptions {
  constructor() {
    this.defaultSettings = {
      autoScan: true,
      sensitivity: 'medium',
      showWarnings: true,
      highlightContent: true,
      voiceAlerts: false,
      backendUrl: 'http://localhost:8000'
    };
    
    this.defaultStats = {
      totalScans: 0,
      threatsBlocked: 0,
      safeContent: 0
    };

    this.init();
  }

  async init() {
    console.log('🛡️ TruthLens Options Page Initialized');
    
    // Load current settings
    await this.loadSettings();
    
    // Load statistics
    await this.loadStats();
    
    // Check backend connection
    await this.checkConnection();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['truthlensSettings']);
      const settings = result.truthlensSettings || this.defaultSettings;
      
      // Update UI with current settings
      document.getElementById('autoScan').checked = settings.autoScan;
      document.getElementById('sensitivity').value = settings.sensitivity;
      document.getElementById('showWarnings').checked = settings.showWarnings;
      document.getElementById('highlightContent').checked = settings.highlightContent;
      document.getElementById('voiceAlerts').checked = settings.voiceAlerts;
      document.getElementById('backendUrl').value = settings.backendUrl;
      
      console.log('Settings loaded:', settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['truthlensStats']);
      const stats = result.truthlensStats || this.defaultStats;
      
      // Update UI with current stats
      document.getElementById('totalScans').textContent = stats.totalScans;
      document.getElementById('threatsBlocked').textContent = stats.threatsBlocked;
      document.getElementById('safeContent').textContent = stats.safeContent;
      
      console.log('Stats loaded:', stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async checkConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const backendUrl = document.getElementById('backendUrl').value;
    
    try {
      statusElement.className = 'status-indicator status-disconnected';
      statusElement.innerHTML = '⏳ Checking connection...';
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        statusElement.className = 'status-indicator status-connected';
        statusElement.innerHTML = '✅ Connected to TruthLens Backend';
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      statusElement.className = 'status-indicator status-disconnected';
      statusElement.innerHTML = '❌ Backend Disconnected';
      console.error('Connection check failed:', error);
    }
  }

  setupEventListeners() {
    // Save Settings Button
    document.getElementById('saveSettings').addEventListener('click', async () => {
      await this.saveSettings();
    });

    // Reset Settings Button
    document.getElementById('resetSettings').addEventListener('click', async () => {
      await this.resetSettings();
    });

    // Test Connection Button
    document.getElementById('testConnection').addEventListener('click', async () => {
      await this.checkConnection();
    });

    // Backend URL change
    document.getElementById('backendUrl').addEventListener('blur', async () => {
      await this.checkConnection();
    });

    // Auto-save on setting changes
    const settingInputs = [
      'autoScan', 'sensitivity', 'showWarnings', 
      'highlightContent', 'voiceAlerts', 'backendUrl'
    ];
    
    settingInputs.forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', () => {
        this.showSaveIndicator();
      });
    });
  }

  async saveSettings() {
    try {
      const settings = {
        autoScan: document.getElementById('autoScan').checked,
        sensitivity: document.getElementById('sensitivity').value,
        showWarnings: document.getElementById('showWarnings').checked,
        highlightContent: document.getElementById('highlightContent').checked,
        voiceAlerts: document.getElementById('voiceAlerts').checked,
        backendUrl: document.getElementById('backendUrl').value
      };

      await chrome.storage.sync.set({ truthlensSettings: settings });
      
      // Notify content scripts of settings change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            settings: settings
          }).catch(() => {}); // Ignore errors for inactive tabs
        });
      });

      this.showSuccessMessage('Settings saved successfully! ✅');
      console.log('Settings saved:', settings);
      
    } catch (error) {
      this.showErrorMessage('Error saving settings: ' + error.message);
      console.error('Error saving settings:', error);
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      try {
        await chrome.storage.sync.set({ truthlensSettings: this.defaultSettings });
        await chrome.storage.local.set({ truthlensStats: this.defaultStats });
        
        // Reload the page to show default settings
        location.reload();
        
      } catch (error) {
        this.showErrorMessage('Error resetting settings: ' + error.message);
        console.error('Error resetting settings:', error);
      }
    }
  }

  showSaveIndicator() {
    const saveButton = document.getElementById('saveSettings');
    const originalText = saveButton.innerHTML;
    
    saveButton.innerHTML = '💾 Unsaved Changes';
    saveButton.style.background = 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
    
    // Reset after 3 seconds
    setTimeout(() => {
      saveButton.innerHTML = originalText;
      saveButton.style.background = '';
    }, 3000);
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast message-${type}`;
    messageDiv.innerHTML = message;
    
    // Style the message
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
    `;

    document.body.appendChild(messageDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TruthLensOptions();
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);