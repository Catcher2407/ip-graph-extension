// src/popup/popup.ts
import { connectWallet, disconnectWallet, updateWalletUI, getCurrentWallet } from './modules/wallet-integration';
import { IPGraphVisualizer } from './modules/ip-graph-visualizer';
import { StoryAPI } from './modules/story-api';
import { AnalyticsDashboard } from './modules/analytics-dashboard';

// Global variables
let graphVisualizer: IPGraphVisualizer | null = null;
let storyAPI: StoryAPI | null = null;
let analyticsDashboard: AnalyticsDashboard | null = null;
let analyticsData = {
  totalIPs: 0,
  totalRelationships: 0,
  avgDerivatives: 0
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('IP Graph Extension popup loaded');
  
const prefersDark = localStorage.getItem('darkMode') === 'true';
if (prefersDark) {
  document.body.classList.add('dark-mode');
}

  // Initialize components
  initializeTabs();
  initializeSearch();
  initializeWallet();
  initializeAnalytics();
  
  // Initialize API
  storyAPI = new StoryAPI();
  
  // Initialize graph visualizer
  const graphCanvas = document.getElementById('graph-canvas');
  if (graphCanvas) {
    graphVisualizer = new IPGraphVisualizer(graphCanvas);
  }
  
  // Check for stored IP from context menu or content script
  checkForStoredIP();
  
  // Update wallet UI
  updateWalletUI();
});

function initializeTabs(): void {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).getAttribute('data-tab');
      
      // Remove active class from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      const targetContent = document.getElementById(target!);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

function initializeSearch(): void {
  const searchInput = document.getElementById('search') as HTMLInputElement;
  const visualizeBtn = document.getElementById('visualize') as HTMLButtonElement;
  const randomBtn = document.getElementById('random-ip') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-graph') as HTMLButtonElement;
  
  // Visualize button
  visualizeBtn?.addEventListener('click', async () => {
    const ipId = searchInput?.value.trim();
    if (ipId) {
      await analyzeIP(ipId);
    }
  });
  
  // Enter key in search input
  searchInput?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const ipId = searchInput.value.trim();
      if (ipId) {
        await analyzeIP(ipId);
      }
    }
  });
  
  // Random IP button
  randomBtn?.addEventListener('click', async () => {
    const randomIP = await getRandomIP();
    if (randomIP && searchInput) {
      searchInput.value = randomIP;
      await analyzeIP(randomIP);
    }
  });
  
  // Clear graph button
  clearBtn?.addEventListener('click', () => {
    clearGraph();
  });
}

function initializeWallet(): void {
  const connectBtn = document.getElementById('connect-wallet') as HTMLButtonElement;
  const disconnectBtn = document.getElementById('disconnect-wallet') as HTMLButtonElement;
  
  // Use the correct function name
  connectBtn?.addEventListener('click', async () => {
    try {
      await connectWallet(); // Changed from connectWalletConnect
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  });
  
  disconnectBtn?.addEventListener('click', async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  });
}

// Update initializeAnalytics function
function initializeAnalytics(): void {
  const analyticsContainer = document.getElementById('analytics-content');
  if (analyticsContainer) {
    analyticsDashboard = new AnalyticsDashboard(analyticsContainer);
    analyticsDashboard.render();
  }

  // Listen for search events
  document.addEventListener('searchIP', (e: any) => {
    const { ipId } = e.detail;
    const searchInput = document.getElementById('search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = ipId;
      analyzeIP(ipId);
    }
  });
}

// Update analyzeIP function to track analytics
async function analyzeIP(ipId: string): Promise<void> {
  if (!graphVisualizer || !storyAPI) return;
  
  const startTime = performance.now();
  let success = false;
  
  try {
    showLoading(true);
    
    // Fetch IP data from Story Protocol
    const ipData = await storyAPI.getIPAsset(ipId);
    const relationships = await storyAPI.getIPRelationships(ipId);
    
    // Track analytics
    if (analyticsDashboard) {
      analyticsDashboard.trackSearch(ipId, ipData.name || 'Unknown IP');
      analyticsDashboard.trackVisualization(relationships.length);
      analyticsDashboard.updateRevenue(ipData.revenue || 0);
    }
    
    // Update analytics display
    analyticsData.totalIPs++;
    analyticsData.totalRelationships += relationships.length;
    analyticsData.avgDerivatives = analyticsData.totalRelationships / analyticsData.totalIPs;
    updateAnalyticsDisplay();
    
    // Visualize the graph
    await graphVisualizer.loadIPRelationships(ipId, ipData, relationships);
    
    // Update details panel
    updateDetailsPanel(ipData, relationships);
    
    success = true;
    showLoading(false);
    
  } catch (error) {
    console.error('Failed to analyze IP:', error);
    showError('Failed to analyze IP. Please check the ID and try again.');
    showLoading(false);
  } finally {
    // Track performance
    const loadTime = (performance.now() - startTime) / 1000;
    if (analyticsDashboard) {
      analyticsDashboard.trackPerformance(loadTime, success);
    }
  }
}

async function getRandomIP(): Promise<string | null> {
  if (!storyAPI) return null;
  
  try {
    return await storyAPI.getRandomIP();
  } catch (error) {
    console.error('Failed to get random IP:', error);
    return null;
  }
}

function clearGraph(): void {
  if (graphVisualizer) {
    graphVisualizer.clear();
  }
  
  const detailsPanel = document.getElementById('ip-details');
  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div class="placeholder">
        <span class="placeholder-icon">🎯</span>
        <p>Search for an IP Asset to see its relationship graph</p>
      </div>
    `;
  }
  
  const searchInput = document.getElementById('search') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
  }
}

function updateDetailsPanel(ipData: any, relationships: any[]): void {
  const detailsPanel = document.getElementById('ip-details');
  if (!detailsPanel) return;
  
  let html = `
    <div class="ip-info">
      <h3>📋 IP Asset Details</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">ID:</span>
          <span class="value">${ipData.id}</span>
        </div>
        <div class="info-item">
          <span class="label">Owner:</span>
          <span class="value">${ipData.owner || 'Unknown'}</span>
        </div>
        <div class="info-item">
          <span class="label">Type:</span>
          <span class="value">${ipData.type || 'IP Asset'}</span>
        </div>
        <div class="info-item">
          <span class="label">Derivatives:</span>
          <span class="value">${relationships.filter(r => r.type === 'derivative').length}</span>
        </div>
      </div>
    </div>
  `;
  
  if (relationships.length > 0) {
    html += `
      <div class="relationships">
        <h4>🔗 Relationships (${relationships.length})</h4>
        <div class="relationship-list">
    `;
    
    relationships.forEach(rel => {
      html += `
        <div class="relationship-item">
          <span class="rel-type">${rel.type}</span>
          <span class="rel-target">${rel.target}</span>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  detailsPanel.innerHTML = html;
}

function updateAnalyticsDisplay(): void {
  const totalIPsEl = document.getElementById('total-ips');
  const totalRelsEl = document.getElementById('total-relationships');
  const avgDerivsEl = document.getElementById('avg-derivatives');
  
  if (totalIPsEl) totalIPsEl.textContent = analyticsData.totalIPs.toString();
  if (totalRelsEl) totalRelsEl.textContent = analyticsData.totalRelationships.toString();
  if (avgDerivsEl) {
    const avg = analyticsData.totalIPs > 0 ? 
      (analyticsData.totalRelationships / analyticsData.totalIPs).toFixed(1) : '0';
    avgDerivsEl.textContent = avg;
  }
}

function showLoading(show: boolean): void {
  const loading = document.getElementById('graph-loading');
  if (loading) {
    loading.classList.toggle('hidden', !show);
  }
}

function showError(message: string): void {
  const detailsPanel = document.getElementById('ip-details');
  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div class="error-message">
        <span class="error-icon">❌</span>
        <p>${message}</p>
      </div>
    `;
  }
}

// Add to popup.ts - update checkForStoredIP function
async function checkForStoredIP(): Promise<void> {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getStoredIP' });
    console.log('Stored IP data:', result);
    
    if (result.selectedIP) {
      const searchInput = document.getElementById('search') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = result.selectedIP;
        
        // Show context information if available
        if (result.fromContextMenu) {
          showContextInfo(result);
        }
        
        // Handle page detection results
        if (result.fromPageDetection && result.detectedIPs) {
          showDetectedIPsPanel(result.detectedIPs);
        }
        
        // Auto-analyze the IP
        await analyzeIP(result.selectedIP);
      }
    }
    
    // Handle multiple detected IPs
    if (result.detectedIPs && result.detectedIPs.length > 0) {
      showDetectedIPsPanel(result.detectedIPs);
    }
    
  } catch (error) {
    console.error('Failed to check stored IP:', error);
  }
}

// Show context information
function showContextInfo(data: any): void {
  const contextPanel = document.createElement('div');
  contextPanel.className = 'context-info-panel';
  contextPanel.innerHTML = `
    <div class="context-header">
      <span class="context-icon">🎯</span>
      <span class="context-title">IP Detected from Context Menu</span>
      <button class="context-close">✕</button>
    </div>
    <div class="context-details">
      ${data.sourceTitle ? `<div class="context-item"><strong>Source:</strong> ${data.sourceTitle}</div>` : ''}
      ${data.sourceUrl ? `<div class="context-item"><strong>URL:</strong> ${data.sourceUrl}</div>` : ''}
      ${data.ipType ? `<div class="context-item"><strong>Type:</strong> ${data.ipType}</div>` : ''}
      ${data.selectionContext ? `<div class="context-item"><strong>Context:</strong> "${data.selectionContext}"</div>` : ''}
      <div class="context-item"><strong>Detected:</strong> ${new Date(data.timestamp).toLocaleString()}</div>
    </div>
  `;

  // Add styles
  contextPanel.style.cssText = `
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    font-size: 12px;
  `;

  // Insert before search section
  const searchSection = document.querySelector('.search-section');
  if (searchSection) {
    searchSection.parentNode?.insertBefore(contextPanel, searchSection);
  }

  // Add close functionality
  const closeBtn = contextPanel.querySelector('.context-close');
  closeBtn?.addEventListener('click', () => {
    contextPanel.remove();
  });

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (contextPanel.parentNode) {
      contextPanel.remove();
    }
  }, 10000);
}

// Show detected IPs panel
function showDetectedIPsPanel(detectedIPs: any[]): void {
  const detectedPanel = document.createElement('div');
  detectedPanel.className = 'detected-ips-panel';
  detectedPanel.innerHTML = `
    <div class="detected-header">
      <span class="detected-icon">🔍</span>
      <span class="detected-title">Detected IPs (${detectedIPs.length})</span>
      <button class="detected-close">✕</button>
    </div>
    <div class="detected-list">
      ${detectedIPs.slice(0, 10).map((ip, index) => `
        <div class="detected-item" data-ip="${ip.ip}">
          <div class="detected-ip">${ip.ip.slice(0, 12)}...${ip.ip.slice(-8)}</div>
          <div class="detected-type">${ip.type}</div>
          <div class="detected-context">${ip.context?.slice(0, 40)}...</div>
          <button class="analyze-ip-btn" data-ip="${ip.ip}">🔍</button>
        </div>
      `).join('')}
      ${detectedIPs.length > 10 ? `<div class="detected-more">+${detectedIPs.length - 10} more IPs detected</div>` : ''}
    </div>
  `;

  // Add styles
  detectedPanel.style.cssText = `
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin: 10px 0;
    max-height: 300px;
    overflow-y: auto;
  `;

  // Insert after search section
  const searchSection = document.querySelector('.search-section');
  if (searchSection) {
    searchSection.parentNode?.insertBefore(detectedPanel, searchSection.nextSibling);
  }

  // Add event listeners
  const analyzeButtons = detectedPanel.querySelectorAll('.analyze-ip-btn');
  analyzeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ip = btn.getAttribute('data-ip');
      if (ip) {
        const searchInput = document.getElementById('search') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = ip;
          analyzeIP(ip);
        }
      }
    });
  });

  // Add close functionality
  const closeBtn = detectedPanel.querySelector('.detected-close');
  closeBtn?.addEventListener('click', () => {
    detectedPanel.remove();
  });
}

  // Dark Mode Toggle Handler
const toggleDarkMode = document.getElementById("dark-mode-toggle");
toggleDarkMode?.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark.toString());
});


// Export functions for use in other modules
(window as any).analyzeIP = analyzeIP;
(window as any).clearGraph = clearGraph;