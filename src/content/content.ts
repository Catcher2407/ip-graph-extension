// src/content/content.ts
console.log('IP Graph content script loaded');

// Configuration
const CONFIG = {
  enableAutoDetection: true,
  showFloatingIndicator: true,
  highlightDetectedIPs: true,
  debounceDelay: 1000
};

// IP detection patterns (renamed to avoid conflict)
const CONTENT_IP_PATTERNS = {
  ethereum: /0x[a-fA-F0-9]{40}/g,
  ensName: /[a-zA-Z0-9-]+\.eth/g,
  storyIP: /0x[a-fA-F0-9]{40}/g
};

// Detected IPs storage (renamed and fixed type)
let contentDetectedIPs: Array<{
  ip: string;
  type: string;
  element: HTMLElement;
  context: string;
}> = [];

let floatingIndicator: HTMLElement | null = null;
let debounceTimer: number | null = null;

// Initialize content script
function initialize(): void {
  if (CONFIG.enableAutoDetection) {
    detectIPsOnPage();
    setupMutationObserver();
  }
  
  setupMessageListener();
  console.log('IP Graph content script initialized');
}

// Detect IPs on the current page
function detectIPsOnPage(): void {
  const newDetectedIPs: typeof contentDetectedIPs = [];
  
  // Get all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script and style elements
        const parent = node.parentElement;
        if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes: Text[] = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  // Search for IPs in text nodes
  textNodes.forEach(textNode => {
    const text = textNode.textContent || '';
    const parent = textNode.parentElement;
    
    if (!parent) return;

    for (const [type, pattern] of Object.entries(CONTENT_IP_PATTERNS)) {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(text)) !== null) {
        const ip = match[0];
        const index = match.index;
        
        // Get context around the IP
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + ip.length + 30);
        const context = text.slice(start, end).trim();

        // Check if IP is already detected
        if (!newDetectedIPs.find(detected => detected.ip === ip)) {
          newDetectedIPs.push({
            ip,
            type,
            element: parent,
            context
          });

          // Highlight the IP if enabled
          if (CONFIG.highlightDetectedIPs) {
            highlightIPInElement(parent, ip);
          }
        }
      }
    }
  });

  contentDetectedIPs = newDetectedIPs;
  
  if (contentDetectedIPs.length > 0) {
    updateFloatingIndicator();
    notifyBackgroundScript();
  }
}

// Highlight detected IP in element
function highlightIPInElement(element: HTMLElement, ip: string): void {
  const text = element.textContent || '';
  const index = text.indexOf(ip);
  
  if (index === -1) return;

  try {
    const range = document.createRange();
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );

    let currentOffset = 0;
    let textNode;
    
    while (textNode = walker.nextNode()) {
      const nodeText = textNode.textContent || '';
      const nodeLength = nodeText.length;
      
      if (currentOffset <= index && index < currentOffset + nodeLength) {
        const startOffset = index - currentOffset;
        const endOffset = startOffset + ip.length;
        
        range.setStart(textNode, startOffset);
        range.setEnd(textNode, endOffset);
        
        // Create highlight span
        const highlight = document.createElement('span');
        highlight.className = 'ip-graph-highlight';
        highlight.style.cssText = `
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        
        highlight.title = `IP Address: ${ip}\nClick to analyze`;
        highlight.addEventListener('click', () => analyzeIP(ip));
        highlight.addEventListener('mouseenter', () => {
          highlight.style.transform = 'scale(1.05)';
          highlight.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        });
        highlight.addEventListener('mouseleave', () => {
          highlight.style.transform = 'scale(1)';
          highlight.style.boxShadow = 'none';
        });
        
        try {
          range.surroundContents(highlight);
        } catch (e) {
          // If range spans multiple elements, use different approach
          highlight.textContent = ip;
          range.deleteContents();
          range.insertNode(highlight);
        }
        
        break;
      }
      
      currentOffset += nodeLength;
    }
  } catch (error) {
    console.warn('Failed to highlight IP:', error);
  }
}

// Update floating indicator
function updateFloatingIndicator(): void {
  if (!CONFIG.showFloatingIndicator) return;

  if (floatingIndicator) {
    floatingIndicator.remove();
  }

  if (contentDetectedIPs.length === 0) return;

  floatingIndicator = document.createElement('div');
  floatingIndicator.id = 'ip-graph-indicator';
  floatingIndicator.innerHTML = `
    <div class="indicator-content">
      <div class="indicator-icon">📊</div>
      <div class="indicator-text">
        <div class="indicator-count">${contentDetectedIPs.length}</div>
        <div class="indicator-label">IP${contentDetectedIPs.length > 1 ? 's' : ''} detected</div>
      </div>
      <div class="indicator-actions">
        <button class="indicator-btn analyze-all" title="Analyze All">🔍</button>
        <button class="indicator-btn close-indicator" title="Close">✕</button>
      </div>
    </div>
    <div class="indicator-dropdown">
      ${contentDetectedIPs.slice(0, 5).map((ip, index) => `
        <div class="ip-item" data-ip="${ip.ip}">
          <div class="ip-address">${ip.ip.slice(0, 10)}...${ip.ip.slice(-8)}</div>
          <div class="ip-type">${ip.type}</div>
          <div class="ip-context">${ip.context.slice(0, 50)}...</div>
        </div>
      `).join('')}
      ${contentDetectedIPs.length > 5 ? `<div class="ip-item more">+${contentDetectedIPs.length - 5} more...</div>` : ''}
    </div>
  `;

  // Add styles
  floatingIndicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 280px;
    max-width: 350px;
    border: 1px solid #e5e7eb;
    animation: slideInRight 0.3s ease;
  `;

  // Add event listeners
  setupIndicatorEventListeners();

  document.body.appendChild(floatingIndicator);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (floatingIndicator && floatingIndicator.parentNode) {
      floatingIndicator.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (floatingIndicator && floatingIndicator.parentNode) {
          floatingIndicator.remove();
        }
      }, 300);
    }
  }, 10000);
}

// Setup indicator event listeners
function setupIndicatorEventListeners(): void {
  if (!floatingIndicator) return;

  // Toggle dropdown
  const indicatorContent = floatingIndicator.querySelector('.indicator-content');
  const dropdown = floatingIndicator.querySelector('.indicator-dropdown');
  
  indicatorContent?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('indicator-btn')) return;
    
    dropdown?.classList.toggle('show');
  });

  // Analyze all button
  const analyzeAllBtn = floatingIndicator.querySelector('.analyze-all');
  analyzeAllBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    analyzeAllDetectedIPs();
  });

  // Close button
  const closeBtn = floatingIndicator.querySelector('.close-indicator');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    floatingIndicator?.remove();
  });

  // IP item clicks
  const ipItems = floatingIndicator.querySelectorAll('.ip-item[data-ip]');
  ipItems.forEach(item => {
    item.addEventListener('click', () => {
      const ip = item.getAttribute('data-ip');
      if (ip) {
        analyzeIP(ip);
      }
    });
  });
}

// Setup mutation observer for dynamic content
function setupMutationObserver(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if added nodes contain text
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE || 
              (node.nodeType === Node.ELEMENT_NODE && (node as Element).textContent)) {
            shouldCheck = true;
            break;
          }
        }
      }
    });
    
    if (shouldCheck) {
      // Debounce the check
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        detectIPsOnPage();
      }, CONFIG.debounceDelay);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Analyze single IP
function analyzeIP(ip: string): void {
  chrome.runtime.sendMessage({
    action: 'analyzeIP',
    ipId: ip
  }, (response) => {
    if (response?.success) {
      showNotification(`Analyzing IP: ${ip.slice(0, 10)}...`);
    }
  });
}

// Analyze all detected IPs
function analyzeAllDetectedIPs(): void {
  if (contentDetectedIPs.length === 0) return;

  // For now, analyze the first IP
  const firstIP = contentDetectedIPs[0];
  analyzeIP(firstIP.ip);
  
  showNotification(`Analyzing ${contentDetectedIPs.length} detected IP${contentDetectedIPs.length > 1 ? 's' : ''}...`);
}

// Notify background script about detected IPs
function notifyBackgroundScript(): void {
  chrome.runtime.sendMessage({
    action: 'ipsDetected',
    ips: contentDetectedIPs.map(ip => ({
      ip: ip.ip,
      type: ip.type,
      context: ip.context
    })),
    url: window.location.href,
    title: document.title
  });
}

// Setup message listener
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getDetectedIPs':
        sendResponse({
          ips: contentDetectedIPs,
          url: window.location.href,
          title: document.title
        });
        break;
        
      case 'highlightIP':
        if (request.ip) {
          const detected = contentDetectedIPs.find(d => d.ip === request.ip);
          if (detected) {
            detected.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            detected.element.style.animation = 'pulse 2s ease-in-out';
          }
        }
        break;
        
      case 'clearHighlights':
        clearAllHighlights();
        break;
    }
    
    return true;
  });
}

// Clear all highlights
function clearAllHighlights(): void {
  const highlights = document.querySelectorAll('.ip-graph-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
      parent.normalize();
    }
  });
}

// Show notification (renamed to avoid conflict)
function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10001;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    animation: slideInRight 0.3s ease;
    max-width: 300px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Add CSS animations
function addStyles(): void {
  if (document.getElementById('ip-graph-content-styles')) return;

  const style = document.createElement('style');
  style.id = 'ip-graph-content-styles';
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    #ip-graph-indicator .indicator-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    #ip-graph-indicator .indicator-content:hover {
      background: #f8f9fa;
    }

    #ip-graph-indicator .indicator-icon {
      font-size: 20px;
    }

    #ip-graph-indicator .indicator-text {
      flex: 1;
    }

    #ip-graph-indicator .indicator-count {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }

    #ip-graph-indicator .indicator-label {
      font-size: 12px;
      color: #666;
    }

    #ip-graph-indicator .indicator-actions {
      display: flex;
      gap: 8px;
    }

    #ip-graph-indicator .indicator-btn {
      background: #f3f4f6;
      border: none;
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    }

    #ip-graph-indicator .indicator-btn:hover {
      background: #e5e7eb;
      transform: scale(1.05);
    }

    #ip-graph-indicator .indicator-dropdown {
      display: none;
      border-top: 1px solid #e5e7eb;
      max-height: 200px;
      overflow-y: auto;
    }

    #ip-graph-indicator .indicator-dropdown.show {
      display: block;
    }

    #ip-graph-indicator .ip-item {
      padding: 12px 15px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    #ip-graph-indicator .ip-item:hover {
      background: #f8f9fa;
    }

    #ip-graph-indicator .ip-item:last-child {
      border-bottom: none;
    }

    #ip-graph-indicator .ip-address {
      font-family: monospace;
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    #ip-graph-indicator .ip-type {
      font-size: 10px;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    #ip-graph-indicator .ip-context {
      font-size: 11px;
      color: #666;
      line-height: 1.3;
    }

    #ip-graph-indicator .ip-item.more {
      text-align: center;
      color: #667eea;
      font-weight: 600;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    addStyles();
    initialize();
  });
} else {
  addStyles();
  initialize();
}