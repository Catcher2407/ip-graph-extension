// src/popup/modules/wallet-integration.ts
import SignClient from '@walletconnect/sign-client';
import { getSdkError } from '@walletconnect/utils';
import type { SessionTypes } from '@walletconnect/types';

interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
  chainId: number;
  provider: string;
  network: string;
}

let currentWallet: WalletInfo | null = null;
let signClient: SignClient | null = null;
let session: SessionTypes.Struct | null = null;

// Story Aeneid Testnet configuration
const STORY_AENEID_CHAIN_ID = 1315;
const STORY_AENEID_RPC = 'https://aeneid.storyrpc.io';
const STORY_CHAIN = `eip155:${STORY_AENEID_CHAIN_ID}`;

// Initialize WalletConnect
async function initializeWalletConnect(): Promise<void> {
  try {
    const projectId = process.env.WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';
    
    if (!projectId || projectId === 'YOUR_PROJECT_ID_HERE') {
      console.warn('Please set your WalletConnect Project ID in .env file');
      return;
    }

    signClient = await SignClient.init({
      projectId,
      metadata: {
        name: 'IP Graph Extension',
        description: 'Story Protocol IP Analytics & Visualization',
        url: 'https://story-ip-graph.com',
        icons: ['https://story-ip-graph.com/icon.png']
      }
    });

    // Check for existing sessions
    const sessions = signClient.session.getAll();
    if (sessions.length > 0) {
      session = sessions[sessions.length - 1];
      await handleExistingSession();
    }

    setupWalletConnectEvents();
    
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error);
  }
}

function setupWalletConnectEvents(): void {
  if (!signClient) return;

  signClient.on('session_event', (event) => {
    console.log('WalletConnect session event:', event);
  });

  signClient.on('session_update', ({ topic, params }) => {
    console.log('WalletConnect session update:', { topic, params });
    const { namespaces } = params;
    const _session = signClient!.session.get(topic);
    const updatedSession = { ..._session, namespaces };
    session = updatedSession;
  });

  signClient.on('session_delete', () => {
    console.log('WalletConnect session deleted');
    handleDisconnection();
  });
}

// Connect wallet using WalletConnect
export async function connectWalletConnect(): Promise<void> {
  try {
    updateConnectionStatus('connecting', 'Initializing WalletConnect...');
    
    if (!signClient) {
      await initializeWalletConnect();
    }

    if (!signClient) {
      throw new Error('Failed to initialize WalletConnect');
    }

    updateConnectionStatus('connecting', 'Opening WalletConnect...');

    const { uri, approval } = await signClient.connect({
      requiredNamespaces: {
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
          ],
          chains: [STORY_CHAIN],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    if (uri) {
      // Create a simple modal with QR code link
      showWalletConnectModal(uri);
      updateConnectionStatus('connecting', 'Scan QR code with your wallet...');
    }

    // Wait for session approval
    session = await approval();
    hideWalletConnectModal();
    await handleSuccessfulConnection();

  } catch (error) {
    console.error('WalletConnect connection failed:', error);
    hideWalletConnectModal();
    updateConnectionStatus('error', 'Connection failed');
    showConnectionError(error);
  }
}

function showWalletConnectModal(uri: string): void {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'wc-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    max-width: 400px;
    width: 90%;
  `;

  modalContent.innerHTML = `
    <h3 style="margin-bottom: 20px; color: #333;">Connect Your Wallet</h3>
    <p style="margin-bottom: 20px; color: #666;">Scan QR code with your mobile wallet or click the button below:</p>
    <div style="margin-bottom: 20px;">
      <a href="https://walletconnect.com/qr?uri=${encodeURIComponent(uri)}" target="_blank" 
         style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; 
                border-radius: 8px; text-decoration: none; font-weight: 600;">
        Open WalletConnect
      </a>
    </div>
    <button id="wc-cancel" style="background: #f8f9fa; border: 1px solid #dee2e6; 
                                   padding: 8px 16px; border-radius: 6px; cursor: pointer;">
      Cancel
    </button>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add cancel functionality
  const cancelBtn = document.getElementById('wc-cancel');
  cancelBtn?.addEventListener('click', () => {
    hideWalletConnectModal();
    updateConnectionStatus('connecting', 'Connection cancelled');
  });
}

function hideWalletConnectModal(): void {
  const modal = document.getElementById('wc-modal');
  if (modal) {
    modal.remove();
  }
}

async function handleExistingSession(): Promise<void> {
  if (!session) return;
  
  try {
    const accounts = Object.values(session.namespaces)
      .map((namespace: any) => namespace.accounts)
      .flat();
    
    if (accounts.length > 0) {
      const account = accounts[0];
      const address = account.split(':')[2];
      
      currentWallet = {
        address,
        balance: '0.0000',
        connected: true,
        chainId: STORY_AENEID_CHAIN_ID,
        provider: 'WalletConnect',
        network: 'Story Aeneid Testnet'
      };
      
      updateConnectionStatus('connected', 'Connected via WalletConnect');
      updateWalletUI();
      await loadUserIPAssets();
      
      // Fetch balance
      await fetchWalletBalance(address);
    }
  } catch (error) {
    console.error('Error handling existing session:', error);
  }
}

async function handleSuccessfulConnection(): Promise<void> {
  try {
    if (!session) return;
    
    updateConnectionStatus('connecting', 'Fetching wallet details...');
    
    const accounts = Object.values(session.namespaces)
      .map((namespace: any) => namespace.accounts)
      .flat();
    
    if (accounts.length > 0) {
      const account = accounts[0];
      const address = account.split(':')[2];
      
      currentWallet = {
        address,
        balance: '0.0000',
        connected: true,
        chainId: STORY_AENEID_CHAIN_ID,
        provider: 'WalletConnect',
        network: 'Story Aeneid Testnet'
      };
      
      updateConnectionStatus('connected', 'Connected via WalletConnect');
      updateWalletUI();
      await loadUserIPAssets();
      showSuccessMessage();
      
      // Fetch balance
      await fetchWalletBalance(address);
    }
    
  } catch (error) {
    console.error('Error handling connection:', error);
    updateConnectionStatus('error', 'Failed to fetch wallet details');
  }
}

async function fetchWalletBalance(address: string): Promise<void> {
  try {
    const response = await fetch(STORY_AENEID_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    
    const data = await response.json();
    
    if (data.result) {
      const balanceWei = parseInt(data.result, 16);
      const balanceEth = balanceWei / Math.pow(10, 18);
      
      if (currentWallet) {
        currentWallet.balance = balanceEth.toFixed(4);
        updateWalletUI();
      }
    }
  } catch (error) {
    console.error('Failed to fetch balance:', error);
  }
}

function handleDisconnection(): void {
  session = null;
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
    if (signClient && session) {
      await signClient.disconnect({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
    }
    handleDisconnection();
  } catch (error) {
    console.error('Error disconnecting:', error);
    handleDisconnection();
  }
}

// MetaMask fallback
async function connectMetaMask(): Promise<void> {
  try {
    if (typeof (window as any).ethereum === 'undefined') {
      throw new Error('MetaMask not found');
    }

    const ethereum = (window as any).ethereum;
    
    const accounts = await ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const address = accounts[0];
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== STORY_AENEID_CHAIN_ID) {
      await switchToStoryAeneid(ethereum);
    }
    
    const balance = await ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    
    currentWallet = {
      address,
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
    
  } catch (error) {
    throw error;
  }
}

async function switchToStoryAeneid(ethereum: any): Promise<void> {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${STORY_AENEID_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
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

// Main connect function with fallback
export async function connectWallet(): Promise<void> {
  try {
    // Try WalletConnect first
    await connectWalletConnect();
  } catch (wcError) {
    console.log('WalletConnect failed, trying MetaMask...', wcError);
    try {
      // Fallback to MetaMask
      await connectMetaMask();
    } catch (mmError) {
      console.error('Both WalletConnect and MetaMask failed:', mmError);
      updateConnectionStatus('error', 'Connection failed');
      showConnectionError(mmError);
    }
  }
}

// Rest of the functions...
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
    } else if (error.message.includes('MetaMask not found')) {
      message = 'Please install MetaMask or use WalletConnect.';
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

// Initialize WalletConnect when module loads
initializeWalletConnect();

// Add styles
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