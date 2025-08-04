import { connectWalletConnect, disconnectWallet, updateWalletUI, getCurrentWallet } from './modules/wallet-integration';
import { IPGraphVisualizer } from './modules/ip-graph-visualizer';
import { StoryAPI } from './modules/story-api';

// Global variables
let graphVisualizer: IPGraphVisualizer | null = null;
let storyAPI: StoryAPI | null = null;
let analyticsData = {
  totalIPs: 0,
  totalRelationships: 0,
  avgDerivatives: 0
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('IP Graph Extension popup loaded');
  
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
  
  connectBtn?.addEventListener('click', async () => {
    try {
      await connectWalletConnect();
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

function initializeAnalytics(): void {
  updateAnalyticsDisplay();
}

async function analyzeIP(ipId: string): Promise<void> {
  if (!graphVisualizer || !storyAPI) return;
  
  try {
    showLoading(true);
    
    // Fetch IP data from Story Protocol
    const ipData = await storyAPI.getIPAsset(ipId);
    const relationships = await storyAPI.getIPRelationships(ipId);
    
    // Update analytics
    analyticsData.totalIPs++;
    analyticsData.totalRelationships += relationships.length;
    updateAnalyticsDisplay();
    
    // Visualize the graph
    await graphVisualizer.loadIPRelationships(ipId, ipData, relationships);
    
    // Update details panel
    updateDetailsPanel(ipData, relationships);
    
    showLoading(false);
    
  } catch (error) {
    console.error('Failed to analyze IP:', error);
    showError('Failed to analyze IP. Please check the ID and try again.');
    showLoading(false);
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

async function checkForStoredIP(): Promise<void> {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getStoredIP' });
    if (result.selectedIP) {
      const searchInput = document.getElementById('search') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = result.selectedIP;
        await analyzeIP(result.selectedIP);
      }
    }
  } catch (error) {
    console.error('Failed to check stored IP:', error);
  }
}

// Export functions for use in other modules
(window as any).analyzeIP = analyzeIP;
(window as any).clearGraph = clearGraph;