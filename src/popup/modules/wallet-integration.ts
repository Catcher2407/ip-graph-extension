import { createConfig } from 'wagmi';
import { http } from 'viem';
import { mainnet, arbitrum, polygon } from 'viem/chains';
import { reconnect, getAccount, getBalance, disconnect } from '@wagmi/core';
import { createWeb3Modal } from '@web3modal/wagmi';

interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
  chainId: number;
  provider: string;
  network: string;
}

let currentWallet: WalletInfo | null = null;
let web3Modal: any = null;
let wagmiConfig: any = null;

// Story Aeneid Testnet configuration
const storyAeneid = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  network: 'story-aeneid',
  nativeCurrency: {
    decimals: 18,
    name: 'IP',
    symbol: 'IP',
  },
  rpcUrls: {
    public: { http: ['https://aeneid.storyrpc.io'] },
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'StoryScan', url: 'https://aeneid.storyscan.io' },
  },
} as const;

// Initialize Web3Modal
function initializeWeb3Modal(): void {
  const projectId = process.env.WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
  
  if (!projectId || projectId === 'YOUR_PROJECT_ID_HERE') {
    console.warn('Please set your WalletConnect Project ID');
  }

  // Fix: Ensure chains is properly typed as readonly array
  const chains = [storyAeneid, mainnet, polygon, arbitrum] as const;
  
  // Use wagmi's createConfig with proper typing
  wagmiConfig = createConfig({
    chains,
    transports: {
      [storyAeneid.id]: http('https://aeneid.storyrpc.io'),
      [mainnet.id]: http(),
      [polygon.id]: http(),
      [arbitrum.id]: http(),
    },
  });

  web3Modal = createWeb3Modal({ 
    wagmiConfig, 
    projectId: projectId,
    metadata: {
      name: 'IP Graph Visualizer Pro',
      description: 'Advanced Analytics & Story Protocol Explorer',
      url: 'https://your-extension-url.com',
      icons: ['https://your-icon-url.com/icon.png']
    },
    themeMode: 'light',
    themeVariables: {
      '--w3m-color-mix': '#667eea',
      '--w3m-color-mix-strength': 20
    }
  });

  setupWeb3ModalEvents();
}

function setupWeb3ModalEvents(): void {
  if (!web3Modal) return;

  web3Modal.subscribeEvents((event: any) => {
    console.log('Web3Modal event:', event);
    
    if (event.type === 'MODAL_CLOSE') {
      setTimeout(checkConnectionStatus, 1000);
    }
  });
}

// Connect wallet using Web3Modal
export async function connectWalletConnect(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Opening WalletConnect...');
    
    if (!web3Modal) {
      initializeWeb3Modal();
    }

    await web3Modal.open();
    
  } catch (error) {
    console.error('WalletConnect connection failed:', error);
    updateConnectionStatus('error', 'Connection failed');
    showConnectionError(error);
  }
}

async function checkConnectionStatus(): Promise<void> {
  try {
    // Fix: Pass wagmiConfig as parameter
    const account = getAccount(wagmiConfig);
    
    if (account.isConnected && account.address) {
      await handleSuccessfulConnection(account);
    } else {
      updateConnectionStatus('connecting', 'Disconnected');
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
  }
}

async function handleSuccessfulConnection(account: any): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Fetching wallet details...');
    
    // Fix: Pass wagmiConfig and proper parameters
    const balance = await getBalance(wagmiConfig, {
      address: account.address,
      chainId: account.chainId
    });
    
    currentWallet = {
      address: account.address,
      balance: parseFloat(balance.formatted).toFixed(4),
      connected: true,
      chainId: account.chainId || 1315,
      provider: 'WalletConnect',
      network: getNetworkName(account.chainId || 1315)
    };
    
    updateConnectionStatus('connected', 'Connected via WalletConnect');
    updateWalletUI();
    await loadUserIPAssets();
    showSuccessMessage();
    
  } catch (error) {
    console.error('Error handling connection:', error);
    updateConnectionStatus('error', 'Failed to fetch wallet details');
  }
}

function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    1315: 'Story Aeneid Testnet',
    137: 'Polygon',
    56: 'BSC',
    43114: 'Avalanche',
    42161: 'Arbitrum'
  };
  
  return networks[chainId] || `Unknown Network (${chainId})`;
}

// Disconnect wallet
export async function disconnectWallet(): Promise<void> {
  try {
    // Fix: Pass wagmiConfig as parameter
    await disconnect(wagmiConfig);
    
    currentWallet = null;
    updateConnectionStatus('connecting', 'Disconnected');
    updateWalletUI();
    
    const ipDetails = document.getElementById('ip-details');
    if (ipDetails) {
      ipDetails.innerHTML = '';
    }
    
    showDisconnectionMessage();
    
  } catch (error) {
    console.error('Error disconnecting:', error);
  }
}

// Rest of the functions remain the same...
export function updateWalletUI(): void {
  const walletStatus = document.getElementById('wallet-status');
  const connectionStatus = document.getElementById('connection-status');
  const walletAddress = document.getElementById('wallet-address');
  const walletBalance = document.getElementById('wallet-balance');
  const walletNetwork = document.getElementById('wallet-network');
  const disconnectBtn = document.getElementById('disconnect-wallet');
  
  const addressItem = document.getElementById('wallet-address-item');
  const balanceItem = document.getElementById('wallet-balance-item');
  const networkItem = document.getElementById('wallet-network-item');
  
  if (currentWallet?.connected) {
    if (walletStatus) {
      walletStatus.className = 'wallet-status connected';
    }
    
    if (connectionStatus) {
      connectionStatus.textContent = 'Connected via WalletConnect';
    }
    
    if (walletAddress) {
      walletAddress.textContent = `${currentWallet.address.slice(0, 6)}...${currentWallet.address.slice(-4)}`;
    }
    
    if (walletBalance) {
      const symbol = currentWallet.chainId === 1315 ? '$IP' : 'ETH';
      walletBalance.textContent = `${currentWallet.balance} ${symbol}`;
    }
    
    if (walletNetwork) {
      walletNetwork.textContent = currentWallet.network;
    }
    
    if (addressItem) addressItem.style.display = 'flex';
    if (balanceItem) balanceItem.style.display = 'flex';
    if (networkItem) networkItem.style.display = 'flex';
    
    if (disconnectBtn) {
      disconnectBtn.style.display = 'block';
    }
  } else {
    if (walletStatus) {
      walletStatus.className = 'wallet-status';
    }
    
    if (connectionStatus) {
      connectionStatus.textContent = 'Disconnected';
    }
    
    if (addressItem) addressItem.style.display = 'none';
    if (balanceItem) balanceItem.style.display = 'none';
    if (networkItem) networkItem.style.display = 'none';
    
    if (disconnectBtn) {
      disconnectBtn.style.display = 'none';
    }
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
  const notification = createNotification('✅ Wallet Connected Successfully!', 'success');
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showDisconnectionMessage(): void {
  const notification = createNotification('🔌 Wallet Disconnected', 'info');
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
    } else if (error.message.includes('timeout')) {
      message = 'Connection timeout. Please try again.';
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
    const userAssets = [
      {
        id: '0x1234567890123456789012345678901234567890',
        name: 'My Creative Work #1',
        derivatives: [],
        totalRevenue: '8.2'
      },
      {
        id: '0x2345678901234567890123456789012345678901',
        name: 'Digital Art Collection',
        derivatives: [{ id: '0x3456' }],
        totalRevenue: '15.7'
      }
    ];
    
    displayUserAssets(userAssets);
  } catch (error) {
    console.error('Failed to load user assets:', error);
  }
}

function displayUserAssets(assets: any[]): void {
  const ipDetails = document.getElementById('ip-details');
  if (!ipDetails) return;
  
  let html = '<div class="user-assets">';
  html += '<h3>👤 Your IP Assets</h3>';
  
  if (assets.length === 0) {
    html += '<p>You don\'t own any IP Assets yet.</p>';
  } else {
    html += '<div class="assets-list">';
    assets.forEach(asset => {
      html += `
        <div class="asset-item" data-ip-id="${asset.id}">
          <div class="asset-name">${asset.name || 'Unnamed IP'}</div>
          <div class="asset-id">${asset.id}</div>
          <div class="asset-stats">
            <span>Derivatives: ${asset.derivatives?.length || 0}</span>
            <span>Revenue: ${asset.totalRevenue || '0'} $IP</span>
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

// Initialize Web3Modal when module loads
initializeWeb3Modal();

// Add notification animations
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
`;
document.head.appendChild(style);