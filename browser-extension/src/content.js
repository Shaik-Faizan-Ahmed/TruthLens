/**
 * TruthLens Content Script
 * Scans webpage content for misinformation and scams
 * ONLY shows warnings for dangerous/suspicious content
 */

class TruthLensScanner {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8000';
    this.isScanning = false;
    this.scanInterval = null;
    this.processedElements = new WeakSet();
    this.processedTexts = new Set(); // Track processed text content to avoid duplicates
    this.settings = {
      autoScan: true,
      sensitivity: 'medium',
      showPositive: false, // NEVER show safe content
      voiceAlerts: false
    };
    
    this.init();
  }

  async init() {
    console.log('🛡️ TruthLens activated on:', window.location.hostname);
    
    // Skip certain websites where scanning shouldn't happen
    if (this.shouldSkipWebsite()) {
      console.log('🚫 Skipping TruthLens scanning on this website');
      return;
    }
    
    // Load settings from storage
    await this.loadSettings();
    
    // Inject CSS styles
    this.injectStyles();
    
    // Start scanning if auto-scan is enabled
    if (this.settings.autoScan) {
      this.startContinuousScanning();
    }

    // Listen for dynamic content changes
    this.observePageChanges();
  }

  shouldSkipWebsite() {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    
    // Skip search engines and input-focused sites
    const skipDomains = [
      'google.com', 'www.google.com',
      'bing.com', 'www.bing.com',
      'yahoo.com', 'search.yahoo.com',
      'duckduckgo.com', 'www.duckduckgo.com',
      'baidu.com', 'www.baidu.com'
    ];
    
    // Skip if on search engine
    if (skipDomains.some(domain => hostname.includes(domain))) {
      return true;
    }
    
    // Skip if on admin/settings pages
    const skipPaths = [
      '/admin', '/settings', '/preferences', '/config',
      '/dashboard', '/control-panel', '/wp-admin'
    ];
    
    if (skipPaths.some(path => pathname.startsWith(path))) {
      return true;
    }
    
    return false;
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['truthlens_settings', 'truthlens_api_url']);
      if (result.truthlens_settings) {
        this.settings = { ...this.settings, ...result.truthlens_settings };
      }
      if (result.truthlens_api_url) {
        this.apiBaseUrl = result.truthlens_api_url;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  injectStyles() {
    if (document.getElementById('truthlens-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'truthlens-styles';
    styleSheet.textContent = `
      @keyframes truthlens-pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
      }
      
      .truthlens-danger-highlight {
        border: 3px solid #FF4444 !important;
        border-radius: 8px !important;
        background: rgba(255, 68, 68, 0.1) !important;
        animation: truthlens-pulse 2s infinite !important;
        position: relative !important;
      }
      
      .truthlens-caution-highlight {
        border: 2px solid #FF8C00 !important;
        border-radius: 8px !important;
        background: rgba(255, 140, 0, 0.05) !important;
        position: relative !important;
      }
      
      .truthlens-marker {
        position: absolute !important;
        top: -8px !important;
        right: -8px !important;
        z-index: 999999 !important;
        padding: 4px 8px !important;
        border-radius: 12px !important;
        font-size: 12px !important;
        font-weight: bold !important;
        color: white !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
      }
      
      .truthlens-marker-danger {
        background: linear-gradient(135deg, #FF4444, #FF6B6B) !important;
      }
      
      .truthlens-marker-caution {
        background: linear-gradient(135deg, #FF8C00, #FFB347) !important;
      }
      
      .truthlens-popup {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 999999 !important;
        background: white !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
        max-width: 480px !important;
        width: 90vw !important;
        max-height: 70vh !important;
        overflow: hidden !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
      }
      
      .truthlens-popup-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0,0,0,0.8) !important;
        z-index: 999998 !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  startContinuousScanning() {
    // Scan immediately
    this.scanVisibleContent();
    
    // Set up periodic scanning with shorter intervals
    this.scanInterval = setInterval(() => {
      this.scanVisibleContent();
    }, 3000); // Reduced from 5000 to 3000ms for more responsive scanning
    
    // Also scan on scroll to catch newly visible content
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (this.settings.autoScan) {
          this.scanVisibleContent();
        }
      }, 1000);
    }, { passive: true });
  }

  stopContinuousScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  observePageChanges() {
    // Watch for new content being added to the page
    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              hasNewContent = true;
            }
          });
        }
      });

      if (hasNewContent && this.settings.autoScan) {
        // Debounce rapid changes
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
          this.scanVisibleContent();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async scanVisibleContent() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('🔍 Scanning page content...');

    try {
      // Get text content from various elements
      const textElements = this.extractTextElements();
      
      for (const element of textElements) {
        if (this.processedElements.has(element)) continue;
        
        const text = this.getCleanText(element);
        if (this.shouldAnalyzeText(text)) {
          // Check if we've already processed this exact text content
          const textHash = this.hashText(text);
          if (!this.processedTexts.has(textHash)) {
            await this.analyzeAndMarkElement(element, text);
            this.processedTexts.add(textHash);
          }
        }
        
        this.processedElements.add(element);
      }
    } catch (error) {
      console.error('⚠️ Scanning error:', error);
    } finally {
      this.isScanning = false;
    }
  }

  hashText(text) {
    // Create a simple hash of the text to avoid processing duplicates
    // Normalize text by removing extra spaces and converting to lowercase
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  extractTextElements() {
    // Get all text-containing elements with a comprehensive approach
    const elements = [];
    const processedNodes = new Set();
    
    // Primary selectors for common content containers
    const primarySelectors = [
      // Social media posts
      '[data-testid="post_message"]', // Facebook posts
      '.message-in .copyable-text', // WhatsApp messages  
      '[data-testid="tweetText"]', // Twitter tweets
      '.comment-content', // YouTube comments
      '[data-testid="cellInnerDiv"]', // Twitter/X content
      '.post-content', '.message-content', '.chat-message',
      
      // News and articles
      'article p', 'article div',
      '.article-content p', '.article-content div',
      '.news-content p', '.news-content div',
      '.content p', '.content div',
      
      // General content containers
      'p', 'div', 'span', 'td', 'li',
      '[class*="message"]', '[class*="post"]', '[class*="comment"]',
      '[class*="text"]', '[class*="content"]', '[class*="body"]',
      '[id*="message"]', '[id*="post"]', '[id*="comment"]',
      '[id*="text"]', '[id*="content"]'
    ];

    // First pass: Get elements from selectors
    primarySelectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
          if (this.isValidTextElement(el) && !processedNodes.has(el)) {
            elements.push(el);
            processedNodes.add(el);
          }
        });
      } catch (error) {
        // Skip invalid selectors
      }
    });

    // Second pass: Walk the DOM tree to find text-heavy elements we might have missed
    this.walkDOMForTextElements(document.body, elements, processedNodes);

    // Filter and sort by relevance
    return elements.filter(el => 
      this.isElementVisible(el) && 
      !this.processedElements.has(el) && 
      !el.classList.contains('truthlens-marker') &&
      !this.isIgnoredElement(el)
    ).slice(0, 50); // Limit to 50 elements per scan to avoid performance issues
  }

  walkDOMForTextElements(node, elements, processedNodes) {
    if (!node || processedNodes.has(node) || elements.length > 100) return;
    
    // Check if current node has substantial text content
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = this.getCleanText(node);
      
      // If this element has good text content and isn't already processed
      if (text.length >= 30 && text.length <= 2000 && !processedNodes.has(node)) {
        // Make sure it's not just containing other elements' text
        const directText = this.getDirectTextContent(node);
        if (directText.length >= 20) {
          // Check if any parent already contains this text to avoid duplicates
          if (!this.hasParentWithSameText(node, text)) {
            elements.push(node);
            processedNodes.add(node);
            return; // Don't process children if we added the parent
          }
        }
      }
    }

    // Recursively check children if we didn't add current node
    if (node.childNodes && node.childNodes.length > 0) {
      for (let child of node.childNodes) {
        this.walkDOMForTextElements(child, elements, processedNodes);
      }
    }
  }

  hasParentWithSameText(element, text) {
    // Check if any parent element already contains the same text content
    let parent = element.parentElement;
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    
    while (parent && parent !== document.body) {
      const parentText = this.getCleanText(parent).toLowerCase().replace(/\s+/g, ' ').trim();
      
      // If parent contains the exact same text, skip this element
      if (parentText === normalizedText) {
        return true;
      }
      
      parent = parent.parentElement;
    }
    
    return false;
  }

  isValidTextElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    const text = this.getCleanText(element);
    return text.length >= 20 && text.length <= 2000;
  }

  getDirectTextContent(element) {
    // Get only the direct text content, not from child elements
    let directText = '';
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent;
      }
    }
    return directText.replace(/\s+/g, ' ').trim();
  }

  isIgnoredElement(element) {
    // Skip certain types of elements that shouldn't be scanned
    const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK'];
    const ignoredClasses = ['truthlens-marker', 'truthlens-popup'];
    const ignoredIds = ['truthlens-styles'];
    
    if (ignoredTags.includes(element.tagName)) return true;
    if (ignoredIds.includes(element.id)) return true;
    if (ignoredClasses.some(cls => element.classList.contains(cls))) return true;
    
    // Skip navigation, header, footer elements
    const containerRoles = ['navigation', 'banner', 'contentinfo', 'complementary'];
    if (containerRoles.includes(element.getAttribute('role'))) return true;
    
    // Skip elements that are likely UI components
    const uiPatterns = [
      /header/i, /footer/i, /nav/i, /menu/i, /sidebar/i,
      /button/i, /control/i, /toolbar/i, /breadcrumb/i
    ];
    
    const classString = element.className || '';
    const idString = element.id || '';
    
    return uiPatterns.some(pattern => 
      pattern.test(classString) || pattern.test(idString)
    );
  }

  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 && 
      rect.height > 0 && 
      rect.top >= 0 && 
      rect.top <= window.innerHeight
    );
  }

  getCleanText(element) {
    // Get text content and clean it
    let text = element.textContent || element.innerText || '';
    
    // Remove extra whitespace and normalize
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove URLs for cleaner analysis
    text = text.replace(/https?:\/\/[^\s]+/g, '[URL]');
    
    return text;
  }

  shouldAnalyzeText(text) {
    // Filter criteria for analysis
    if (text.length < 15) return false; // Lowered from 20 to catch shorter scam messages
    if (text.length > 2000) return false; // Too long
    
    // Skip navigation, headers, etc.
    const skipPatterns = [
      /^(home|about|contact|menu|login|register|sign in|sign up)$/i,
      /^(click here|read more|see more|view more|load more)$/i,
      /^\d{1,2}:\d{2}(\s?(AM|PM))?$/i, // Time stamps
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i, // Dates
      /^\d+\s+(like|comment|share|view)s?$/i, // Social media counts
      /^(©|\u00A9).*\d{4}/i, // Copyright notices
      /^terms|privacy|policy|cookie/i, // Legal text
      /^search|filter|sort/i, // UI controls
      /^\s*$/, // Empty or whitespace only
      /^[^\w\s]*$/ // Only punctuation/symbols
    ];
    
    // Skip if text matches common UI patterns
    if (skipPatterns.some(pattern => pattern.test(text.trim()))) return false;
    
    // Skip if text is mostly numbers or very short words
    const words = text.split(/\s+/).filter(word => word.length > 2);
    if (words.length < 3) return false;
    
    // Skip if it's just a URL
    if (/^https?:\/\/[^\s]+$/.test(text.trim())) return false;
    
    return true;
  }

  async analyzeAndMarkElement(element, text) {
    try {
      console.log('🔍 Analyzing text:', text.substring(0, 100) + '...');
      
      const response = await fetch(`${this.apiBaseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          content_type: 'text',
          language: 'en',
          source_app: 'browser_extension'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Analysis result:', result.risk_level, result.confidence);
      
      // CRITICAL CHANGE: Only mark dangerous or caution content - NEVER safe content
      // Lowered thresholds to catch more potential scams
      if (result.risk_level === 'danger' && result.confidence > 0.25) {
        this.markElement(element, result, 'danger');
        
        // Show notification for high-risk content
        if (result.confidence > 0.5) {
          this.showDangerNotification(result, text.substring(0, 100));
        }
      } else if (result.risk_level === 'caution' && result.confidence > 0.3) {
        this.markElement(element, result, 'caution');
      }
      // DO NOT mark safe content - removed the else block completely

    } catch (error) {
      console.error('⚠️ Analysis failed:', error);
    }
  }

  markElement(element, analysisResult, riskLevel) {
    // Remove any existing TruthLens markers
    this.clearElementMarkers(element);
    
    // Add highlight class only for dangerous/caution content
    if (riskLevel === 'danger') {
      element.classList.add('truthlens-danger-highlight');
    } else if (riskLevel === 'caution') {
      element.classList.add('truthlens-caution-highlight');
    }
    
    // Add warning marker only for dangerous/caution content
    const marker = this.createMarker(riskLevel, analysisResult);
    element.style.position = 'relative';
    element.appendChild(marker);
  }

  clearElementMarkers(element) {
    // Remove existing TruthLens elements
    const existing = element.querySelectorAll('.truthlens-marker');
    existing.forEach(el => el.remove());
    
    // Reset element styling - remove ALL highlight classes
    element.classList.remove('truthlens-danger-highlight', 'truthlens-caution-highlight');
  }

  createMarker(riskLevel, result) {
    const marker = document.createElement('div');
    marker.className = `truthlens-marker truthlens-marker-${riskLevel}`;
    
    const icons = {
      caution: '⚠️', 
      danger: '🚨'
    };
    
    const messages = {
      caution: 'CAUTION',
      danger: 'SCAM ALERT'
    };

    marker.innerHTML = `${icons[riskLevel]} ${messages[riskLevel]}`;
    
    // Add click handler for details
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showDetailedResult(result);
    });

    return marker;
  }

  showDangerNotification(result, textPreview) {
    // Create browser notification for dangerous content only
    if (Notification.permission === 'granted') {
      new Notification('🚨 TruthLens Warning', {
        body: `Scam detected: ${result.detected_patterns?.[0] || 'Suspicious pattern'}\n"${textPreview}..."`,
        icon: chrome.runtime.getURL('assets/icon48.png'),
        requireInteraction: true
      });
    }

    // Voice alert if enabled
    if (this.settings.voiceAlerts && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Warning! This content appears to be ${result.detected_patterns?.[0] || 'suspicious'}. Please be careful.`
      );
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  showDetailedResult(result) {
    // Remove existing popup
    const existingPopup = document.querySelector('.truthlens-popup-overlay');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'truthlens-popup-overlay';
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'truthlens-popup';
    popup.innerHTML = `
      <div style="background: linear-gradient(135deg, #4CAF50, #32CD32); color: white; padding: 20px; text-align: center;">
        <h3 style="margin: 0; font-size: 20px;">🛡️ TruthLens Analysis</h3>
      </div>
      <div style="padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">${result.risk_level === 'danger' ? '🚨' : '⚠️'}</div>
          <h3 style="color: ${result.risk_level === 'danger' ? '#FF4444' : '#FF8C00'}; margin-bottom: 4px; text-transform: uppercase;">
            ${result.risk_level === 'danger' ? 'SCAM DETECTED' : 'EXERCISE CAUTION'}
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
            <strong style="color: #333;">Detected warning signs:</strong>
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
        
        <button id="close-truthlens-result" style="
          width: 100%;
          padding: 12px;
          background: #2E8B57;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        ">Got It</button>
      </div>
    `;

    // Add to page
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Close handlers
    document.getElementById('close-truthlens-result').addEventListener('click', () => {
      overlay.remove();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // Public methods for extension popup/background
  async analyzeSelectedText() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 10) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: selectedText,
            content_type: 'text',
            language: 'en',
            source_app: 'browser_extension_manual'
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        
        // Show result regardless of risk level for manual analysis
        this.showDetailedResult(result);
        
      } catch (error) {
        console.error('Analysis failed:', error);
        alert('Analysis failed: ' + error.message);
      }
    } else {
      alert('Please select some text to analyze (at least 10 characters)');
    }
  }

  toggleAutoScan() {
    this.settings.autoScan = !this.settings.autoScan;
    if (this.settings.autoScan) {
      this.startContinuousScanning();
    } else {
      this.stopContinuousScanning();
    }
    this.saveSettings();
  }

  clearAllMarkers() {
    // Remove all TruthLens markers from the page
    const markers = document.querySelectorAll('.truthlens-marker');
    markers.forEach(marker => marker.remove());
    
    const highlights = document.querySelectorAll('.truthlens-danger-highlight, .truthlens-caution-highlight');
    highlights.forEach(element => {
      element.classList.remove('truthlens-danger-highlight', 'truthlens-caution-highlight');
    });
    
    // Clear processed elements AND processed texts so they can be re-scanned
    this.processedElements = new WeakSet();
    this.processedTexts = new Set();
  }

  async saveSettings() {
    await chrome.storage.sync.set({ truthlens_settings: this.settings });
  }
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.truthLensScanner = new TruthLensScanner();
  });
} else {
  window.truthLensScanner = new TruthLensScanner();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'analyzeSelected':
      window.truthLensScanner.analyzeSelectedText();
      sendResponse({ success: true });
      break;
    
    case 'toggleAutoScan':
      window.truthLensScanner.toggleAutoScan();
      sendResponse({ success: true });
      break;
    
    case 'forceScan':
      window.truthLensScanner.scanVisibleContent();
      sendResponse({ success: true });
      break;
      
    case 'clearAllMarkers':
      window.truthLensScanner.clearAllMarkers();
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      sendResponse({
        isScanning: window.truthLensScanner.isScanning,
        autoScan: window.truthLensScanner.settings.autoScan,
        elementsProcessed: window.truthLensScanner.processedElements.size || 0
      });
      break;
      
    case 'showAnalysisResult':
      window.truthLensScanner.showDetailedResult(message.result);
      sendResponse({ success: true });
      break;
  }
  
  return true; // Keep message channel open for async responses
});