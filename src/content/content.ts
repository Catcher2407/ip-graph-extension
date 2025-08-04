// Content script for IP Graph Extension
console.log('IP Graph content script loaded');

// Detect IP addresses on the page
function detectIPAddresses(): string[] {
  const ipPattern = /0x[a-fA-F0-9]{40}/g;
  const pageText = document.body.innerText;
  const matches = pageText.match(ipPattern);
  return matches ? [...new Set(matches)] : [];
}

// Add visual indicators for detected IPs
function addIPIndicators(): void {
  const ipAddresses = detectIPAddresses();
  
  if (ipAddresses.length > 0) {
    // Create floating indicator
    const indicator = document.createElement('div');
    indicator.id = 'ip-graph-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        📊 ${ipAddresses.length} IP${ipAddresses.length > 1 ? 's' : ''} detected
      </div>
    `;
    
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'analyzeIP',
        ipId: ipAddresses[0] // Analyze first detected IP
      });
    });
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }
}

// Run detection when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addIPIndicators);
} else {
  addIPIndicators();
}

// Re-run detection on dynamic content changes
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldCheck = true;
    }
  });
  
  if (shouldCheck) {
    // Debounce the check
    clearTimeout((window as any).ipCheckTimeout);
    (window as any).ipCheckTimeout = setTimeout(addIPIndicators, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});