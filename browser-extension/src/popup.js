/**
 * TruthLens Extension Popup Script
 * Handles popup UI interactions and communicates with content script
 */

class TruthLensPopup {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8000';
    this.currentTab = null;
    this.settings = {
      autoScan: true,
      sensitivity: 'medium',
      apiUrl: 'http://localhost:8000'
    };

    this.init();
  }

  async init() {
    // Load settings and current tab info
    await this.loadSettings();
    await this.getCurrentTab();
    
    // Initialize UI
    this.initializeUI();
    this.bindEvents();
    
    // Update status
    this.updateConnectionStatus();
    this.updatePageInfo();
    this.updateStats();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['truthlens_settings', 'truthlens_api_url']);
      if (result.truthlens_settings) {
        this.settings = { ...this.settings, ...result.truthlens_settings };
      }
      if (result.truthlens_api_url) {
        this.apiBaseUrl = result.truthlens_api_url;
        this.settings.apiUrl = result.truthlens_api_url;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ 
        truthlens_settings: this.settings,
        truthlens_api_url: this.apiBaseUrl
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  }

  initializeUI() {
    // Set initial toggle states
    document.getElementById('auto-scan-toggle').checked = this.settings.autoScan;
    
    // Update current domain
    if (this.currentTab) {
      const domain = new URL(this.currentTab.url).hostname;
      document.getElementById('current-domain').textContent = domain;
    }
  }

  bindEvents() {
    // Auto-scan toggle
    document.getElementById('auto-scan-toggle').addEventListener('change', (e) => {
      this.settings.autoScan = e.target.checked;
      this.saveSettings();
      this.toggleAutoScan();
    });

    // Quick action buttons
    document.getElementById('scan-page-btn').addEventListener('click', () => {
      this.scanCurrentPage();
    });

    document.getElementById('analyze-selected-btn').addEventListener('click', () => {
      this.analyzeSelectedText();
    });

    document.getElementById('clear-markers-btn').addEventListener('click', () => {
      this.clearAllMarkers();
    });

    // Manual analysis
    document.getElementById('analyze-manual-btn').addEventListener('click', () => {
      this.analyzeManualText();
    });
  }

  async updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    const indicatorElement = document.getElementById('connection-indicator');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        statusElement.textContent = 'Connected';
        indicatorElement.className = 'status-indicator status-connected';
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      statusElement.textContent = 'Disconnected';
      indicatorElement.className = 'status-indicator status-disconnected';
    }
  }

  updatePageInfo() {
    if (this.currentTab) {
      const domain = new URL(this.currentTab.url).hostname;
      document.getElementById('current-domain').textContent = domain;
    }
  }

  async updateStats() {
    try {
      // Get stats from storage
      const result = await chrome.storage.local.get([
        'daily_scans',
        'daily_threats',
        'daily_elements',
        'last_reset_date'
      ]);

      const today = new Date().toDateString();
      
      // Reset daily stats if it's a new day
      if (result.last_reset_date !== today) {
        await chrome.storage.local.set({
          daily_scans: 0,
          daily_threats: 0,
          daily_elements: 0,
          last_reset_date: today
        });
      }

      // Update UI
      document.getElementById('scans-count').textContent = result.daily_scans || 0;
      document.getElementById('threats-blocked').textContent = result.daily_threats || 0;
      document.getElementById('elements-checked').textContent = result.daily_elements || 0;
      
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async sendMessageToContentScript(message) {
    if (!this.currentTab) return null;
    
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, message);
      return response;
    } catch (error) {
      console.error('Error communicating with content script:', error);
      this.showError('Cannot communicate with the current page. Please refresh and try again.');
      return null;
    }
  }

  async scanCurrentPage() {
    const button = document.getElementById('scan-page-btn');
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '<span class="action-icon">⏳</span>Scanning...';
      button.disabled = true;
      
      const response = await this.sendMessageToContentScript({
        action: 'forceScan'
      });
      
      if (response?.success) {
        this.showSuccess('Page scan completed!');
        await this.incrementStat('daily_scans');
        this.updateStats();
      } else {
        this.showError('Failed to scan page');
      }
      
    } catch (error) {
      this.showError('Scan failed: ' + error.message);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async analyzeSelectedText() {
    const button = document.getElementById('analyze-selected-btn');
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '<span class="action-icon">⏳</span>Analyzing...';
      button.disabled = true;
      
      const response = await this.sendMessageToContentScript({
        action: 'analyzeSelected'
      });
      
      if (response?.success) {
        this.showSuccess('Selected text analyzed!');
      } else {
        this.showError('No text selected or analysis failed');
      }
      
    } catch (error) {
      this.showError('Analysis failed: ' + error.message);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async clearAllMarkers() {
    const button = document.getElementById('clear-markers-btn');
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '<span class="action-icon">⏳</span>Clearing...';
      button.disabled = true;
      
      const response = await this.sendMessageToContentScript({
        action: 'clearAllMarkers'
      });
      
      if (response?.success) {
        this.showSuccess('All markers cleared!');
      } else {
        this.showError('Failed to clear markers');
      }
      
    } catch (error) {
      this.showError('Clear failed: ' + error.message);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async analyzeManualText() {
    const textInput = document.getElementById('manual-text-input');
    const button = document.getElementById('analyze-manual-btn');
    const text = textInput.value.trim();
    
    if (!text) {
      this.showError('Please enter some text to analyze');
      return;
    }

    if (text.length < 10) {
      this.showError('Text too short - please enter at least 10 characters');
      return;
    }

    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '<span class="action-icon">⏳</span>Analyzing...';
      button.disabled = true;
      textInput.disabled = true;
      
      const response = await fetch(`${this.apiBaseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          content_type: 'text',
          language: 'en',
          source_app: 'browser_extension_manual'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      this.showAnalysisResult(result, text);
      
      // Clear input after successful analysis
      textInput.value = '';
      
      // Update stats
      await this.incrementStat('daily_elements');
      if (result.risk_level === 'danger') {
        await this.incrementStat('daily_threats');
      }
      this.updateStats();
      
    } catch (error) {
      this.showError('Analysis failed: ' + error.message);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
      textInput.disabled = false;
    }
  }

  showAnalysisResult(result, originalText) {
    const riskColors = {
      safe: '#2E8B57',
      caution: '#FF8C00', 
      danger: '#FF4444'
    };

    const riskIcons = {
      safe: '✅',
      caution: '⚠️',
      danger: '🚨'
    };

    const riskMessages = {
      safe: 'Content appears safe',
      caution: 'Exercise caution',
      danger: 'SCAM DETECTED!'
    };

    // Create result modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    `;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 32px; margin-bottom: 8px;">${riskIcons[result.risk_level]}</div>
        <h3 style="color: ${riskColors[result.risk_level]}; margin-bottom: 4px; text-transform: uppercase;">
          ${riskMessages[result.risk_level]}
        </h3>
        <div style="font-size: 14px; color: #666;">
          Confidence: ${Math.round(result.confidence * 100)}%
        </div>
      </div>
      
      ${result.explanation ? `
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Why this is flagged:</strong>
          <p style="margin-top: 4px; color: #666; line-height: 1.5;">${result.explanation}</p>
        </div>
      ` : ''}
      
      ${result.detected_patterns?.length ? `
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Warning signs detected:</strong>
          <ul style="margin-top: 4px; color: #666; padding-left: 20px;">
            ${result.detected_patterns.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${result.recommendations?.length ? `
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">What you should do:</strong>
          <ul style="margin-top: 4px; color: #666; padding-left: 20px;">
            ${result.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="margin-bottom: 16px;">
        <strong style="color: #333;">Analyzed content:</strong>
        <div style="margin-top: 4px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 13px; color: #555; max-height: 100px; overflow-y: auto;">
          ${originalText}
        </div>
      </div>
      
      <button id="close-result" style="
        width: 100%;
        padding: 12px;
        background: #2E8B57;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
      ">Got It</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close handlers
    document.getElementById('close-result').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async toggleAutoScan() {
    await this.sendMessageToContentScript({
      action: 'toggleAutoScan'
    });
  }

  async incrementStat(statName) {
    try {
      const result = await chrome.storage.local.get(statName);
      const newValue = (result[statName] || 0) + 1;
      await chrome.storage.local.set({ [statName]: newValue });
    } catch (error) {
      console.error('Error updating stat:', error);
    }
  }

  showSuccess(message) {
    this.showNotification(message, '#2E8B57');
  }

  showError(message) {
    this.showNotification(message, '#FF4444');
  }

  showNotification(message, color) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.truthLensPopup = new TruthLensPopup();
});