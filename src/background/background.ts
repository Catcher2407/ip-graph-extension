// Background script for IP Graph Extension
console.log('IP Graph Extension installed');

// Create context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeIP',
    title: 'Analyze IP with Graph',
    contexts: ['selection']
  });
  
  console.log('Context menus created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeIP' && info.selectionText) {
    // Send selected text to popup for analysis
    chrome.storage.local.set({
      selectedIP: info.selectionText,
      fromContextMenu: true
    });
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeIP') {
    // Store IP for analysis
    chrome.storage.local.set({
      selectedIP: request.ipId,
      fromPage: true
    });
    sendResponse({ success: true });
  }
  
  if (request.action === 'getStoredIP') {
    chrome.storage.local.get(['selectedIP', 'fromContextMenu', 'fromPage'], (result) => {
      sendResponse(result);
      // Clear after retrieval
      chrome.storage.local.remove(['fromContextMenu', 'fromPage']);
    });
    return true; // Keep message channel open for async response
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});