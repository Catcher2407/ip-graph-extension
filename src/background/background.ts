// src/background/background.ts
console.log('IP Graph Extension installed');

// IP address patterns for detection (renamed to avoid conflict)
const BACKGROUND_IP_PATTERNS = {
  ethereum: /0x[a-fA-F0-9]{40}/g,
  storyIP: /0x[a-fA-F0-9]{40}/g,
  ensName: /[a-zA-Z0-9-]+\.eth/g,
  contractAddress: /0x[a-fA-F0-9]{40}/g
};

// Storage for detected IPs (renamed to avoid conflict)
let backgroundDetectedIPs: Map<number, Array<{
  ip: string;
  type: string;
  context: string;
  timestamp: number;
}>> = new Map();

// Create context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  // Create main context menus directly without loop to avoid type issues
  chrome.contextMenus.create({
    id: 'analyzeIP',
    title: '🔍 Analyze IP with Graph',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'searchStoryIP',
    title: '📊 Search in Story Protocol',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'detectPageIPs',
    title: '🎯 Detect All IPs on Page',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'openExtension',
    title: '🚀 Open IP Graph Extension',
    contexts: ['page']
  });

  // Create submenu for detected IP types
  chrome.contextMenus.create({
    id: 'ipTypeSubmenu',
    title: '🔗 IP Asset Types',
    contexts: ['selection'],
    parentId: 'analyzeIP'
  });

  chrome.contextMenus.create({
    id: 'analyzeAsOriginal',
    title: '🎨 Analyze as Original Work',
    contexts: ['selection'],
    parentId: 'ipTypeSubmenu'
  });

  chrome.contextMenus.create({
    id: 'analyzeAsDerivative',
    title: '🔄 Analyze as Derivative',
    contexts: ['selection'],
    parentId: 'ipTypeSubmenu'
  });

  chrome.contextMenus.create({
    id: 'analyzeAsLicense',
    title: '📜 Analyze as License',
    contexts: ['selection'],
    parentId: 'ipTypeSubmenu'
  });

  console.log('Context menus created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, info);

  try {
    switch (info.menuItemId) {
      case 'analyzeIP':
      case 'analyzeAsOriginal':
      case 'analyzeAsDerivative':
      case 'analyzeAsLicense':
        await handleIPAnalysis(info, tab);
        break;
        
      case 'searchStoryIP':
        await handleStoryIPSearch(info, tab);
        break;
        
      case 'detectPageIPs':
        await handlePageIPDetection(tab);
        break;
        
      case 'openExtension':
        await handleOpenExtension();
        break;
    }
  } catch (error) {
    console.error('Context menu handler error:', error);
  }
});

// Handle IP analysis from context menu
async function handleIPAnalysis(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  if (!info.selectionText || !tab?.id) return;

  const selectedText = info.selectionText.trim();
  const detectedIP = detectIPInText(selectedText);

  if (detectedIP) {
    // Store the IP for analysis
    await chrome.storage.local.set({
      selectedIP: detectedIP.ip,
      ipType: getIPTypeFromMenuId(info.menuItemId as string),
      fromContextMenu: true,
      sourceUrl: tab.url,
      sourceTitle: tab.title,
      timestamp: Date.now(),
      selectionContext: selectedText
    });

    // Show notification
    await showBackgroundNotification('IP Detected', `Found ${detectedIP.type}: ${detectedIP.ip.slice(0, 10)}...`);

    // Open extension popup
    await chrome.action.openPopup();
  } else {
    await showBackgroundNotification('No IP Found', 'Selected text does not contain a valid IP address');
  }
}

// Handle Story IP search
async function handleStoryIPSearch(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  if (!info.selectionText || !tab?.id) return;

  const selectedText = info.selectionText.trim();
  const detectedIP = detectIPInText(selectedText);

  if (detectedIP) {
    // Store for Story Protocol specific search
    await chrome.storage.local.set({
      selectedIP: detectedIP.ip,
      searchType: 'story-protocol',
      fromContextMenu: true,
      sourceUrl: tab.url,
      timestamp: Date.now()
    });

    await showBackgroundNotification('Story IP Search', `Searching Story Protocol for ${detectedIP.ip.slice(0, 10)}...`);
    await chrome.action.openPopup();
  }
}

// Handle page-wide IP detection
async function handlePageIPDetection(tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.id) return;

  try {
    // Inject content script to detect IPs
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectableDetectAllIPs
    });

    if (results && results[0]?.result) {
      const detectedIPs = results[0].result;
      
      if (detectedIPs.length > 0) {
        // Store detected IPs
        await chrome.storage.local.set({
          detectedIPs: detectedIPs,
          fromPageDetection: true,
          sourceUrl: tab.url,
          sourceTitle: tab.title,
          timestamp: Date.now()
        });

        await showBackgroundNotification(
          'IPs Detected', 
          `Found ${detectedIPs.length} IP address${detectedIPs.length > 1 ? 'es' : ''} on this page`
        );

        await chrome.action.openPopup();
      } else {
        await showBackgroundNotification('No IPs Found', 'No IP addresses detected on this page');
      }
    }
  } catch (error) {
    console.error('Page IP detection failed:', error);
    await showBackgroundNotification('Detection Failed', 'Could not scan page for IP addresses');
  }
}

// Handle opening extension
async function handleOpenExtension(): Promise<void> {
  await chrome.action.openPopup();
}

// Detect IP in selected text
function detectIPInText(text: string): { ip: string; type: string } | null {
  // Try different IP patterns
  for (const [type, pattern] of Object.entries(BACKGROUND_IP_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return {
        ip: matches[0],
        type: type
      };
    }
  }

  return null;
}

// Function to be injected into page for IP detection (renamed to avoid conflict)
function injectableDetectAllIPs(): Array<{
  ip: string;
  type: string;
  context: string;
  element: string;
}> {
  const detectedIPs: Array<{
    ip: string;
    type: string;
    context: string;
    element: string;
  }> = [];

  // IP patterns
  const patterns = {
    ethereum: /0x[a-fA-F0-9]{40}/g,
    ensName: /[a-zA-Z0-9-]+\.eth/g
  };

  // Get all text content
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node as Text);
  }

  // Search for IPs in text nodes
  textNodes.forEach(textNode => {
    const text = textNode.textContent || '';
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Get context around the IP
          const index = text.indexOf(match);
          const start = Math.max(0, index - 50);
          const end = Math.min(text.length, index + match.length + 50);
          const context = text.slice(start, end);

          // Get element info
          const element = textNode.parentElement;
          const elementInfo = element ? 
            `${element.tagName.toLowerCase()}${element.className ? '.' + element.className : ''}` : 
            'text';

          detectedIPs.push({
            ip: match,
            type: type,
            context: context.trim(),
            element: elementInfo
          });
        });
      }
    }
  });

  // Remove duplicates
  const uniqueIPs = detectedIPs.filter((ip, index, self) => 
    index === self.findIndex(t => t.ip === ip.ip)
  );

  return uniqueIPs;
}

// Get IP type from menu ID
function getIPTypeFromMenuId(menuId: string): string {
  const typeMap: Record<string, string> = {
    'analyzeAsOriginal': 'original',
    'analyzeAsDerivative': 'derivative',
    'analyzeAsLicense': 'license',
    'analyzeIP': 'unknown'
  };
  
  return typeMap[menuId] || 'unknown';
}

// Show notification (renamed to avoid conflict)
async function showBackgroundNotification(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: title,
      message: message
    });
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'analyzeIP':
      handleAnalyzeIPMessage(request, sender, sendResponse);
      break;
      
    case 'getStoredIP':
      handleGetStoredIPMessage(request, sender, sendResponse);
      break;
      
    case 'getDetectedIPs':
      handleGetDetectedIPsMessage(request, sender, sendResponse);
      break;
      
    case 'clearStoredData':
      handleClearStoredDataMessage(request, sender, sendResponse);
      break;
  }

  return true; // Keep message channel open for async response
});

// Handle analyze IP message
async function handleAnalyzeIPMessage(
  request: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    await chrome.storage.local.set({
      selectedIP: request.ipId,
      fromMessage: true,
      timestamp: Date.now()
    });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Handle get stored IP message
async function handleGetStoredIPMessage(
  request: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const result = await chrome.storage.local.get([
      'selectedIP', 
      'ipType',
      'fromContextMenu', 
      'fromPageDetection',
      'fromMessage',
      'sourceUrl',
      'sourceTitle',
      'selectionContext',
      'detectedIPs',
      'searchType',
      'timestamp'
    ]);
    
    sendResponse(result);
    
    // Clear after retrieval
    await chrome.storage.local.remove([
      'fromContextMenu', 
      'fromPageDetection',
      'fromMessage'
    ]);
  } catch (error) {
    sendResponse({ error: (error as Error).message });
  }
}

// Handle get detected IPs message
async function handleGetDetectedIPsMessage(
  request: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['detectedIPs']);
    sendResponse(result);
  } catch (error) {
    sendResponse({ error: (error as Error).message });
  }
}

// Handle clear stored data message
async function handleClearStoredDataMessage(
  request: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    await chrome.storage.local.clear();
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

// Listen for tab updates to detect IPs automatically
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-detect IPs on page load (optional)
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: injectableDetectAllIPs
      });

      if (results && results[0]?.result) {
        const ips = results[0].result;
        if (ips.length > 0) {
          backgroundDetectedIPs.set(tabId, ips.map(ip => ({
            ...ip,
            timestamp: Date.now()
          })));
          
          // Update badge with IP count
          await chrome.action.setBadgeText({
            text: ips.length.toString(),
            tabId: tabId
          });
          
          await chrome.action.setBadgeBackgroundColor({
            color: '#667eea',
            tabId: tabId
          });
        }
      }
    } catch (error) {
      // Silently fail for pages where we can't inject scripts
    }
  }
});

// Clear badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  backgroundDetectedIPs.delete(tabId);
});