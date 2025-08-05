// src/popup/modules/wallet-integration.ts
interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
  chainId: number;
  provider: string;
  network: string;
}

let currentWallet: WalletInfo | null = null;
let walletConnectProvider: any = null;

// Story Aeneid Testnet configuration
const STORY_AENEID_CHAIN_ID = 1315;
const STORY_AENEID_RPC = 'https://aeneid.storyrpc.io';

// WalletConnect configuration
const WALLETCONNECT_PROJECT_ID = '872dd7b79a4f1baa768efecf082ed91f'; // Ganti dengan Project ID Anda

// Chain configuration for WalletConnect
const storyAeneidChain = {
  chainId: STORY_AENEID_CHAIN_ID,
  name: 'Story Aeneid Testnet',
  currency: 'IP',
  explorerUrl: 'https://aeneid.storyscan.io',
  rpcUrl: STORY_AENEID_RPC
};

// Main connect function - supports both MetaMask and WalletConnect
export async function connectWallet(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Choose connection method...');
    
    // Show wallet selection modal
    showWalletSelectionModal();
    
  } catch (error: any) {
    console.error('Wallet connection failed:', error);
    updateConnectionStatus('error', 'Connection failed');
    showConnectionError(error);
  }
}

function showWalletSelectionModal(): void {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'wallet-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'wallet-modal';
  modal.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 24px;
    width: 320px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
  `;

  modal.innerHTML = `
    <div class="wallet-modal-header">
      <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Connect Wallet</h3>
      <button class="close-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
    </div>
    <div class="wallet-options">
      <button class="wallet-option metamask-option" style="
        width: 100%;
        padding: 16px;
        margin-bottom: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      ">
        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #f6851b, #e2761b); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">M</div>
        <div style="text-align: left;">
          <div style="font-weight: 600; color: #333; margin-bottom: 2px;">MetaMask</div>
          <div style="font-size: 12px; color: #666;">Browser extension</div>
        </div>
      </button>
      
      <button class="wallet-option walletconnect-option" style="
        width: 100%;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      ">
        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b99fc, #1a73e8); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">W</div>
        <div style="text-align: left;">
          <div style="font-weight: 600; color: #333; margin-bottom: 2px;">WalletConnect</div>
          <div style="font-size: 12px; color: #666;">Mobile & other wallets</div>
        </div>
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Add hover effects
  const walletOptions = modal.querySelectorAll('.wallet-option');
  walletOptions.forEach(option => {
    option.addEventListener('mouseenter', () => {
      (option as HTMLElement).style.borderColor = '#667eea';
      (option as HTMLElement).style.transform = 'translateY(-2px)';
    });
    option.addEventListener('mouseleave', () => {
      (option as HTMLElement).style.borderColor = '#e5e7eb';
      (option as HTMLElement).style.transform = 'translateY(0)';
    });
  });

  // Event listeners
  const closeModal = () => {
    document.body.removeChild(overlay);
    updateConnectionStatus('connecting', 'Connect to Story Protocol');
  };

  modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  modal.querySelector('.metamask-option')?.addEventListener('click', () => {
    closeModal();
    connectMetaMask();
  });

  modal.querySelector('.walletconnect-option')?.addEventListener('click', () => {
    closeModal();
    connectWalletConnect();
  });
}

async function connectMetaMask(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Connecting to MetaMask...');
    
    // Check if MetaMask is available
    if (typeof (window as any).ethereum === 'undefined') {
      throw new Error('MetaMask not found. Please install MetaMask extension.');
    }

    const ethereum = (window as any).ethereum;
    
    // Request account access
    const accounts = await ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    const address = accounts[0];
    
    // Get current chain ID
    const chainId = await ethereum.request({ 
      method: 'eth_chainId' 
    });
    
    const currentChainId = parseInt(chainId, 16);
    
    // Check if we're on Story Aeneid, if not, try to switch
    if (currentChainId !== STORY_AENEID_CHAIN_ID) {
      await switchToStoryAeneid(ethereum);
    }
    
    // Get balance
    const balance = await ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    // Convert balance from wei to ether
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    
    currentWallet = {
      address: address,
      balance: balanceInEth.toFixed(4),
      connected: true,
      chainId: STORY_AENEID_CHAIN_ID,
      provider: 'MetaMask',
      network: 'Story Aeneid Testnet'
    };
    
    updateConnectionStatus('connected', 'Connected via MetaMask');
    updateWalletUI();
    await loadUserIPAssets();
    showSuccessMessage();
    
    // Listen for account/chain changes
    setupMetaMaskEventListeners(ethereum);
    
  } catch (error: any) {
    console.error('MetaMask connection failed:', error);
    updateConnectionStatus('error', 'MetaMask connection failed');
    showConnectionError(error);
  }
}

async function connectWalletConnect(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Initializing WalletConnect...');
    
    // Dynamic import WalletConnect
    const { WalletConnectModal } = await import('@walletconnect/modal');
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    
    // Initialize WalletConnect provider with correct configuration
    walletConnectProvider = await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [STORY_AENEID_CHAIN_ID],
      rpcMap: {
        [STORY_AENEID_CHAIN_ID]: STORY_AENEID_RPC
      },
      metadata: {
        name: 'IP Graph Extension',
        description: 'Visualize IP Asset relationships on Story Protocol',
        url: 'https://your-app-url.com',
        icons: ['https://your-app-url.com/icon.png']
      },
      showQrModal: true, // Required property
      qrModalOptions: {
        themeMode: 'light',
        themeVariables: {
          '--wcm-z-index': '10000'
        }
      }
    });

    // Create modal with string chain ID
    const modal = new WalletConnectModal({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [STORY_AENEID_CHAIN_ID.toString()] // Convert to string
    });

    updateConnectionStatus('connecting', 'Scan QR code with your wallet...');

    // Connect
    await walletConnectProvider.connect();
    
    const accounts = walletConnectProvider.accounts;
    if (accounts.length === 0) {
      throw new Error('No accounts connected');
    }

    const address = accounts[0];
    
    // Get balance using WalletConnect provider
    const balance = await walletConnectProvider.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    
    currentWallet = {
      address: address,
      balance: balanceInEth.toFixed(4),
      connected: true,
      chainId: STORY_AENEID_CHAIN_ID,
      provider: 'WalletConnect',
      network: 'Story Aeneid Testnet'
    };
    
    updateConnectionStatus('connected', 'Connected via WalletConnect');
    updateWalletUI();
    await loadUserIPAssets();
    showSuccessMessage();
    
    // Listen for WalletConnect events
    setupWalletConnectEventListeners();
    
  } catch (error: any) {
    console.error('WalletConnect connection failed:', error);
    updateConnectionStatus('error', 'WalletConnect connection failed');
    showConnectionError(error);
  }
}

async function switchToStoryAeneid(ethereum: any): Promise<void> {
  try {
    // Try to switch to Story Aeneid
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${STORY_AENEID_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    // If chain doesn't exist, add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${STORY_AENEID_CHAIN_ID.toString(16)}`,
          chainName: 'Story Aeneid Testnet',
          nativeCurrency: {
            name: 'IP',
            symbol: 'IP',
            decimals: 18,
          },
          rpcUrls: [STORY_AENEID_RPC],
          blockExplorerUrls: ['https://aeneid.storyscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

function setupMetaMaskEventListeners(ethereum: any): void {
  // Listen for account changes
  ethereum.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnection();
    } else {
      // Account changed, update wallet info
      const newAddress = accounts[0];
      if (currentWallet) {
        currentWallet.address = newAddress;
        updateWalletUI();
      }
    }
  });

  // Listen for chain changes
  ethereum.on('chainChanged', (chainId: string) => {
    const newChainId = parseInt(chainId, 16);
    if (newChainId !== STORY_AENEID_CHAIN_ID) {
      showNetworkWarning();
    }
  });
}

function setupWalletConnectEventListeners(): void {
  if (!walletConnectProvider) return;

  walletConnectProvider.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnection();
    } else {
      const newAddress = accounts[0];
      if (currentWallet) {
        currentWallet.address = newAddress;
        updateWalletUI();
      }
    }
  });

  walletConnectProvider.on('chainChanged', (chainId: number) => {
    if (chainId !== STORY_AENEID_CHAIN_ID) {
      showNetworkWarning();
    }
  });

  walletConnectProvider.on('disconnect', () => {
    handleDisconnection();
  });
}

function showNetworkWarning(): void {
  const notification = createNotification('⚠️ Please switch to Story Aeneid Testnet', 'error');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function handleDisconnection(): void {
  currentWallet = null;
  walletConnectProvider = null;
  updateConnectionStatus('connecting', 'Disconnected');
  updateWalletUI();
  
  const ipDetails = document.getElementById('ip-details');
  if (ipDetails) {
    ipDetails.innerHTML = `
      <div class="placeholder">
        <span class="placeholder-icon">🎯</span>
        <p>Connect wallet and search for an IP Asset to see its relationship graph</p>
      </div>
    `;
  }
  
  showDisconnectionMessage();
}

// Disconnect wallet
export async function disconnectWallet(): Promise<void> {
  try {
    if (walletConnectProvider) {
      await walletConnectProvider.disconnect();
    }
    handleDisconnection();
  } catch (error) {
    console.error('Error disconnecting:', error);
  }
}

export function updateWalletUI(): void {
  const walletStatus = document.getElementById('wallet-status');
  const connectionStatus = document.getElementById('connection-status');
  const walletAddress = document.getElementById('wallet-address');
  const walletBalance = document.getElementById('wallet-balance');
  const walletNetwork = document.getElementById('wallet-network');
  const connectBtn = document.getElementById('connect-wallet');
  const disconnectBtn = document.getElementById('disconnect-wallet');
  
  const addressItem = document.getElementById('wallet-address-item');
  const balanceItem = document.getElementById('wallet-balance-item');
  const networkItem = document.getElementById('wallet-network-item');
  
  if (currentWallet?.connected) {
    if (walletStatus) {
      walletStatus.className = 'wallet-status connected';
    }
    
    if (connectionStatus) {
      connectionStatus.textContent = `Connected via ${currentWallet.provider}`;
    }
    
    if (walletAddress) {
      walletAddress.textContent = `${currentWallet.address.slice(0, 6)}...${currentWallet.address.slice(-4)}`;
    }
    
    if (walletBalance) {
      walletBalance.textContent = `${currentWallet.balance} IP`;
    }
    
    if (walletNetwork) {
      walletNetwork.textContent = 'Story Aeneid Testnet';
    }
    
    if (addressItem) addressItem.style.display = 'flex';
    if (balanceItem) balanceItem.style.display = 'flex';
    if (networkItem) networkItem.style.display = 'flex';
    
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'block';
  } else {
    if (walletStatus) {
      walletStatus.className = 'wallet-status';
    }
    
    if (connectionStatus) {
      connectionStatus.textContent = 'Connect to Story Protocol';
    }
    
    if (addressItem) addressItem.style.display = 'none';
    if (balanceItem) balanceItem.style.display = 'none';
    if (networkItem) networkItem.style.display = 'none';
    
    if (connectBtn) connectBtn.style.display = 'block';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
  }
}

function updateConnectionStatus(status: 'connecting' | 'connected' | 'error', message: string): void {
  const walletStatus = document.getElementById('wallet-status');
  const connectionStatus = document.getElementById('connection-status');
  
  if (walletStatus) {
    walletStatus.className = `wallet-status ${status}`;
  }
  
  if (connectionStatus) {
    connectionStatus.textContent = message;
  }
}

function showSuccessMessage(): void {
  const notification = createNotification(`✅ Connected via ${currentWallet?.provider}!`, 'success');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showDisconnectionMessage(): void {
  const notification = createNotification('🔌 Disconnected from Story Protocol', 'info');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function showConnectionError(error: any): void {
  let message = 'Connection failed. Please try again.';
  
  if (error.message) {
    if (error.message.includes('User rejected')) {
      message = 'Connection cancelled by user.';
    } else if (error.message.includes('MetaMask not found')) {
      message = 'Please install MetaMask extension.';
    } else if (error.message.includes('No accounts found')) {
      message = 'Please unlock your wallet and try again.';
    }
  }
  
  const notification = createNotification(`❌ ${message}`, 'error');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

function createNotification(message: string, type: 'success' | 'error' | 'info'): HTMLElement {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease;
    max-width: 300px;
  `;
  
  const colors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
  };
  
  notification.style.background = colors[type];
  
  return notification;
}

export async function loadUserIPAssets(): Promise<void> {
  if (!currentWallet?.connected) return;
  
  try {
    console.log('Loading user IP assets for:', currentWallet.address);
    
    // Coba ambil IP assets milik user dari Story API
    const userAssets = await fetchUserIPAssets(currentWallet.address);
    
    if (userAssets.length > 0) {
      displayUserAssets(userAssets);
    } else {
      // Jika tidak ada IP assets, tampilkan pesan kosong
      displayEmptyState();
    }
    
  } catch (error) {
    console.error('Failed to load user IP assets:', error);
    displayEmptyState();
  }
}

async function fetchUserIPAssets(userAddress: string): Promise<any[]> {
  try {
    // Coba beberapa endpoint untuk mendapatkan IP assets milik user
    const endpoints = [
      `https://api.storyapis.com/assets/owner/${userAddress}`,
      `https://api.storyapis.com/ip-assets/owner/${userAddress}`,
      `https://api.storyapis.com/users/${userAddress}/assets`,
      `https://api.storyapis.com/v1/assets?owner=${userAddress}`
    ];

    const apiHeaders = {
      'X-CHAIN': 'story-aeneid',
      'X-API-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
      'Content-Type': 'application/json'
    };

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying user assets endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: apiHeaders
        });

        if (response.ok) {
          const data = await response.json();
          console.log('User assets response:', data);
          
          // Handle different response formats
          const assets = Array.isArray(data) ? data : (data.assets || data.data || []);
          
          return assets.map((asset: any) => ({
            id: asset.id || asset.ipId,
            name: asset.name || asset.metadata?.title || `IP Asset ${asset.id?.slice(0, 8)}...`,
            derivatives: asset.derivatives || [],
            totalRevenue: asset.totalRevenue || asset.revenue || '0',
            type: asset.type || 'IP Asset',
            createdAt: asset.createdAt,
            metadata: asset.metadata
          }));
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }

    // Jika semua endpoint gagal, return empty array
    return [];
    
  } catch (error) {
    console.error('Error fetching user IP assets:', error);
    return [];
  }
}

function displayUserAssets(assets: any[]): void {
  // Gunakan container yang berbeda untuk wallet tab
  const ipDetails = document.getElementById('user-ip-assets') || document.getElementById('ip-details');
  if (!ipDetails) return;
  
  let html = '<div class="user-assets">';
  html += '<h3>📋 Your Story IP Assets</h3>';
  html += `<div class="assets-count">${assets.length} IP Asset${assets.length !== 1 ? 's' : ''} found</div>`;
  
  html += '<div class="assets-list">';
  assets.forEach((asset, index) => {
    html += `
      <div class="asset-item" data-ip-id="${asset.id}">
        <div class="asset-header">
          <div class="asset-name">${asset.name || `IP Asset #${index + 1}`}</div>
          <div class="asset-type">${asset.type || 'IP Asset'}</div>
        </div>
        <div class="asset-id">${asset.id.slice(0, 10)}...${asset.id.slice(-8)}</div>
        <div class="asset-stats">
          <span>📊 Derivatives: ${asset.derivatives?.length || 0}</span>
          <span>💰 Revenue: ${asset.totalRevenue || '0'} IP</span>
        </div>
        ${asset.createdAt ? `<div class="asset-date">Created: ${new Date(asset.createdAt).toLocaleDateString()}</div>` : ''}
      </div>
    `;
  });
  html += '</div>';
  html += '</div>';
  
  ipDetails.innerHTML = html;
  
  // Add click handlers
  const assetItems = document.querySelectorAll('.asset-item');
  assetItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const ipId = (e.currentTarget as HTMLElement).getAttribute('data-ip-id');
      if (ipId) {
        searchIP(ipId);
      }
    });
  });
}

function displayEmptyState(): void {
  // Gunakan container yang berbeda untuk wallet tab
  const ipDetails = document.getElementById('user-ip-assets') || document.getElementById('ip-details');
  if (!ipDetails) return;
  
  ipDetails.innerHTML = `
    <div class="user-assets">
      <h3>📋 Your Story IP Assets</h3>
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <h4>No IP Assets Found</h4>
        <p>You don't own any IP Assets on Story Protocol yet.</p>
        <div class="empty-actions">
          <button class="create-ip-btn" onclick="window.open('https://story.foundation', '_blank')">
            Create Your First IP
          </button>
          <button class="refresh-btn" onclick="loadUserIPAssets()">
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  `;
}

export function getCurrentWallet(): WalletInfo | null {
  return currentWallet;
}

function searchIP(ipId: string): void {
  const searchInput = document.getElementById('search') as HTMLInputElement;
  const visualizeBtn = document.getElementById('visualize') as HTMLButtonElement;
  
  if (searchInput) {
    searchInput.value = ipId;
  }
  if (visualizeBtn) {
    visualizeBtn.click();
  }
}

export { searchIP };

// Add notification animations and styles
const style = document.createElement('style');
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
  
  .user-assets {
    margin-top: 15px;
  }
  
  .user-assets h3 {
    margin-bottom: 12px;
    color: #333;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .assets-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .asset-item {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #dee2e6;
  }
  
  .asset-item:hover {
    background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .asset-name {
    font-weight: 600;
    font-size: 13px;
    color: #333;
    margin-bottom: 6px;
  }
  
  .asset-id {
    font-family: monospace;
    font-size: 10px;
    color: #666;
    margin-bottom: 8px;
    background: rgba(255,255,255,0.7);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
  
  .asset-stats {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #555;
    font-weight: 500;
  }
  
  .asset-stats span {
    display: flex;
    align-items: center;
    gap: 2px;
  }
`;
document.head.appendChild(style);