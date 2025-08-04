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

// Story Aeneid Testnet configuration
const STORY_AENEID_CHAIN_ID = 1315;
const STORY_AENEID_RPC = 'https://aeneid.storyrpc.io';

// Simple wallet connection using window.ethereum (MetaMask/injected wallets)
export async function connectWalletConnect(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Connecting to wallet...');
    
    // Check if wallet is available
    if (typeof (window as any).ethereum === 'undefined') {
      throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
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
    
    updateConnectionStatus('connected', 'Connected to Story Protocol');
    updateWalletUI();
    await loadUserIPAssets();
    showSuccessMessage();
    
    // Listen for account/chain changes
    setupWalletEventListeners(ethereum);
    
  } catch (error: any) {
    console.error('Wallet connection failed:', error);
    updateConnectionStatus('error', 'Connection failed');
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

function setupWalletEventListeners(ethereum: any): void {
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

function showNetworkWarning(): void {
  const notification = createNotification('⚠️ Please switch to Story Aeneid Testnet', 'error');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function handleDisconnection(): void {
  currentWallet = null;
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
      connectionStatus.textContent = 'Connected to Story Protocol';
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
  const notification = createNotification('✅ Connected to Story Protocol!', 'success');
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
    } else if (error.message.includes('No wallet found')) {
      message = 'Please install MetaMask or another Web3 wallet.';
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
    // Mock user IP assets on Story Protocol
    const userAssets = [
      {
        id: '0x1234567890123456789012345678901234567890',
        name: 'My Story IP #1',
        derivatives: [],
        totalRevenue: '12.5'
      },
      {
        id: '0x2345678901234567890123456789012345678901',
        name: 'Creative Collection',
        derivatives: [{ id: '0x3456' }, { id: '0x7890' }],
        totalRevenue: '28.7'
      },
      {
        id: '0x3456789012345678901234567890123456789012',
        name: 'Digital Art Series',
        derivatives: [{ id: '0xabcd' }],
        totalRevenue: '15.3'
      }
    ];
    
    displayUserAssets(userAssets);
  } catch (error) {
    console.error('Failed to load user IP assets:', error);
  }
}

function displayUserAssets(assets: any[]): void {
  const ipDetails = document.getElementById('ip-details');
  if (!ipDetails) return;
  
  let html = '<div class="user-assets">';
  html += '<h3>📋 Your Story IP Assets</h3>';
  
  if (assets.length === 0) {
    html += '<p>You don\'t own any IP Assets on Story Protocol yet.</p>';
  } else {
    html += '<div class="assets-list">';
    assets.forEach(asset => {
      html += `
        <div class="asset-item" data-ip-id="${asset.id}">
          <div class="asset-name">${asset.name || 'Unnamed IP'}</div>
          <div class="asset-id">${asset.id.slice(0, 10)}...${asset.id.slice(-8)}</div>
          <div class="asset-stats">
            <span>📊 Derivatives: ${asset.derivatives?.length || 0}</span>
            <span>💰 Revenue: ${asset.totalRevenue || '0'} IP</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div>';
  ipDetails.innerHTML = html;
  
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