/**
 * TruthLens Background Service Worker
 * Handles extension lifecycle, context menus, and notifications
 */

class TruthLensBackground {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8000';
    this.init();
  }

  async init() {
    console.log('🛡️ TruthLens Background Service Worker started');
    
    // Load settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Create context menus
    this.createContextMenus();
    
    // Set up periodic tasks
    this.setupPeriodicTasks();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['truthlens_api_url', 'truthlens_settings']);
      if (result.truthlens_api_url) {
        this.apiBaseUrl = result.truthlens_api_url;
      }
      this.settings = result.truthlens_settings || {
        autoScan: true,
        notifications: true,
        contextMenu: true
      };
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupEventListeners() {
    // Extension installed/updated
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    // Storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.handleStorageChange(changes, areaName);
    });

    // Tab updates (page navigation)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
  }

  createContextMenus() {
    // Clear existing menus
    chrome.contextMenus.removeAll(() => {
      // Main context menu item for selected text
      chrome.contextMenus.create({
        id: 'truthlens-analyze-text',
        title: '🛡️ Check with TruthLens',
        contexts: ['selection']
      });

      // Context menu for links
      chrome.contextMenus.create({
        id: 'truthlens-analyze-link',
        title: '🛡️ Check Link Safety',
        contexts: ['link']
      });

      // Context menu for page
      chrome.contextMenus.create({
        id: 'truthlens-scan-page',
        title: '🛡️ Scan Page for Scams',
        contexts: ['page']
      });
    });
  }

  async handleInstallation(details) {
    console.log('TruthLens installation:', details.reason);
    
    if (details.reason === 'install') {
      // First time installation
      await this.showWelcomeNotification();
      await this.initializeStorage();
      
      // Open options page
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/options.html')
      });
      
    } else if (details.reason === 'update') {
      // Extension updated
      console.log(`Updated from version ${details.previousVersion}`);
      await this.showUpdateNotification();
    }
  }

  async initializeStorage() {
    const defaultSettings = {
      autoScan: true,
      notifications: true,
      contextMenu: true,
      sensitivity: 'medium',
      voiceAlerts: false
    };

    const defaultStats = {
      daily_scans: 0,
      daily_threats: 0,
      daily_elements: 0,
      total_scans: 0,
      total_threats_blocked: 0,
      last_reset_date: new Date().toDateString(),
      installation_date: new Date().toISOString()
    };

    await chrome.storage.sync.set({
      truthlens_settings: defaultSettings,
      truthlens_api_url: this.apiBaseUrl
    });

    await chrome.storage.local.set(defaultStats);
  }

  async handleContextMenuClick(info, tab) {
    console.log('Context menu clicked:', info.menuItemId);

    try {
      switch (info.menuItemId) {
        case 'truthlens-analyze-text':
          await this.analyzeSelectedText(info, tab);
          break;
        case 'truthlens-analyze-link':
          await this.analyzeLink(info, tab);
          break;
        case 'truthlens-scan-page':
          await this.scanPage(tab);
          break;
      }
    } catch (error) {
      console.error('Context menu action failed:', error);
      this.showErrorNotification('Action failed: ' + error.message);
    }
  }

  async analyzeSelectedText(info, tab) {
    if (!info.selectionText) {
      this.showErrorNotification('No text selected');
      return;
    }

    const text = info.selectionText.trim();
    if (text.length < 10) {
      this.showErrorNotification('Selected text too short to analyze');
      return;
    }

    try {
      const result = await this.analyzeContent(text, 'text');
      
      // Send result to content script for display
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showAnalysisResult',
        result: result,
        originalContent: text
      });

      // Update stats
      await this.updateStats(result);
      
      // Show notification for dangerous content
      if (result.risk_level === 'danger') {
        this.showDangerNotification(result, text);
      }

    } catch (error) {
      console.error('Text analysis failed:', error);
      this.showErrorNotification('Analysis failed: ' + error.message);
    }
  }

  async analyzeLink(info, tab) {
    if (!info.linkUrl) return;

    try {
      const result = await this.analyzeContent(info.linkUrl, 'url');
      
      // Send result to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showAnalysisResult',
        result: result,
        originalContent: info.linkUrl
      });

      // Update stats
      await this.updateStats(result);

      if (result.risk_level === 'danger') {
        this.showDangerNotification(result, info.linkUrl);
      }

    } catch (error) {
      console.error('Link analysis failed:', error);
      this.showErrorNotification('Link analysis failed: ' + error.message);
    }
  }

  async scanPage(tab) {
    try {
      // Tell content script to perform full page scan
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'forceScan'
      });

      if (response?.success) {
        this.showSuccessNotification('Page scan completed');
        
        // Update scan count
        await this.incrementStat('daily_scans');
        await this.incrementStat('total_scans');
      } else {
        this.showErrorNotification('Page scan failed');
      }

    } catch (error) {
      console.error('Page scan failed:', error);
      this.showErrorNotification('Cannot scan this page - please refresh and try again');
    }
  }

  async analyzeContent(content, contentType) {
    const response = await fetch(`${this.apiBaseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        content_type: contentType,
        language: 'en',
        source_app: 'browser_extension_context'
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  }

  handleStorageChange(changes, areaName) {
    if (areaName === 'sync' && changes.truthlens_api_url) {
      this.apiBaseUrl = changes.truthlens_api_url.newValue;
      console.log('API URL updated to:', this.apiBaseUrl);
    }

    if (areaName === 'sync' && changes.truthlens_settings) {
      this.settings = changes.truthlens_settings.newValue;
      console.log('Settings updated:', this.settings);
    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Reset processed elements when page changes
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('Page loaded:', tab.url);
    }
  }

  async updateStats(analysisResult) {
    try {
      await this.incrementStat('daily_elements');
      
      if (analysisResult.risk_level === 'danger') {
        await this.incrementStat('daily_threats');
        await this.incrementStat('total_threats_blocked');
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async incrementStat(statName) {
    try {
      const result = await chrome.storage.local.get(statName);
      const newValue = (result[statName] || 0) + 1;
      await chrome.storage.local.set({ [statName]: newValue });
    } catch (error) {
      console.error('Error incrementing stat:', error);
    }
  }

  setupPeriodicTasks() {
    // Reset daily stats at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyStats();
      // Set up daily interval
      setInterval(() => {
        this.resetDailyStats();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  }

  async resetDailyStats() {
    try {
      await chrome.storage.local.set({
        daily_scans: 0,
        daily_threats: 0,
        daily_elements: 0,
        last_reset_date: new Date().toDateString()
      });
      console.log('Daily stats reset');
    } catch (error) {
      console.error('Error resetting daily stats:', error);
    }
  }

  showSuccessNotification(message) {
    if (this.settings.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: '✅ TruthLens',
        message: message
      });
    }
  }

  showErrorNotification(message) {
    if (this.settings.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: '⚠ TruthLens Error',
        message: message
      });
    }
  }

  showDangerNotification(result, content) {
    if (this.settings.notifications) {
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: '🚨 TruthLens Warning',
        message: `Scam detected: ${result.detected_patterns?.[0] || 'Suspicious pattern'}\n"${preview}"`,
        priority: 2,
        requireInteraction: true
      });
    }
  }

  async showWelcomeNotification() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: '🛡️ Welcome to TruthLens!',
      message: 'AI-powered protection against misinformation and scams is now active. Right-click on any text to analyze it!'
    });
  }

  async showUpdateNotification() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: '🔄 TruthLens Updated',
      message: 'TruthLens has been updated with new features and improvements!'
    });
  }
}

// Initialize background service
new TruthLensBackground();