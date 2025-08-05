// src/popup/modules/story-api.ts
import axios from 'axios';

interface IPAssetData {
  id: string;
  name?: string;
  owner?: string;
  type?: string;
  revenue?: number;
  derivatives?: number;
  metadata?: any;
  createdAt?: string;
  totalRevenue?: number;
  monthlyRevenue?: number[];
  licenseTerms?: string[];
  tags?: string[];
}

interface IPRelationship {
  type: 'parent' | 'derivative' | 'license' | 'remix' | 'commercial';
  source: string;
  target: string;
  name?: string;
  owner?: string;
  revenue?: number;
  derivatives?: number;
  licenseType?: string;
  royaltyRate?: number;
  createdAt?: string;
}

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number[];
  topEarningDerivatives: Array<{
    id: string;
    name: string;
    revenue: number;
    royaltyPaid: number;
  }>;
  revenueBreakdown: {
    directSales: number;
    royalties: number;
    licensing: number;
  };
}

export class StoryAPI {
  private apiBaseUrl = 'https://api.storyapis.com';
  private rpcUrl = 'https://aeneid.storyrpc.io';
  private apiHeaders = {
    'X-CHAIN': 'story-aeneid',
    'X-API-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
    'Content-Type': 'application/json'
  };

  constructor() {
    // No initialization needed
  }

  async getIPAsset(ipId: string): Promise<IPAssetData> {
    try {
      console.log(`Fetching IP Asset: ${ipId}`);
      
      // Coba beberapa endpoint yang mungkin benar
      const endpoints = [
        `${this.apiBaseUrl}/assets/${ipId}`,
        `${this.apiBaseUrl}/ip-assets/${ipId}`,
        `${this.apiBaseUrl}/v1/assets/${ipId}`,
        `${this.apiBaseUrl}/api/v1/ip-assets/${ipId}`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: this.apiHeaders,
            timeout: 10000
          });

          console.log('API Response:', response.data);
          const ipData = response.data;
          
          return {
            id: ipData.id || ipId,
            name: ipData.name || ipData.metadata?.title || `IP Asset ${ipId.slice(0, 8)}...`,
            owner: ipData.owner,
            type: ipData.type || 'IP Asset',
            revenue: ipData.revenue || 0,
            derivatives: ipData.derivatives || 0,
            createdAt: ipData.createdAt,
            totalRevenue: ipData.totalRevenue || 0,
            monthlyRevenue: ipData.monthlyRevenue || [],
            licenseTerms: ipData.licenseTerms || [],
            tags: ipData.tags || [],
            metadata: ipData.metadata
          };
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.response?.status);
          continue;
        }
      }
      
      throw new Error('All API endpoints failed');
    } catch (error) {
      console.error('Error fetching IP Asset from API:', error);
      
      // Coba ambil data dari blockchain langsung
      return this.getIPAssetFromBlockchain(ipId);
    }
  }

  private async getIPAssetFromBlockchain(ipId: string): Promise<IPAssetData> {
    try {
      console.log(`Fetching from blockchain: ${ipId}`);
      
      // Cek apakah address valid sebagai contract
      const codeResponse = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [ipId, 'latest'],
        id: 1
      });

      if (codeResponse.data.result === '0x') {
        throw new Error('Address is not a contract');
      }

      // Coba beberapa function selector yang umum untuk IP Asset
      const functionSelectors = [
        '0x06fdde03', // name()
        '0x95d89b41', // symbol()
        '0x8da5cb5b', // owner()
        '0x01ffc9a7'  // supportsInterface()
      ];

      const contractData: any = {};

      for (const selector of functionSelectors) {
        try {
          const response = await axios.post(this.rpcUrl, {
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: ipId,
                data: selector
              },
              'latest'
            ],
            id: 1
          });

          if (response.data.result && response.data.result !== '0x') {
            contractData[selector] = response.data.result;
          }
        } catch (callError) {
          console.log(`Function call ${selector} failed:`, callError);
        }
      }

      if (Object.keys(contractData).length > 0) {
        return {
          id: ipId,
          name: `IP Asset ${ipId.slice(0, 8)}...`,
          owner: 'Unknown',
          type: 'IP Asset',
          revenue: 0,
          derivatives: 0,
          createdAt: new Date().toISOString(),
          totalRevenue: 0,
          monthlyRevenue: [],
          licenseTerms: [],
          tags: ['blockchain', 'story-protocol'],
          metadata: {
            title: `IP Asset ${ipId.slice(0, 8)}`,
            description: 'IP Asset registered on Story Protocol',
            image: 'https://via.placeholder.com/300x300?text=Story+IP',
            contractData: contractData
          }
        };
      }
      
      throw new Error('No contract data found');
    } catch (error) {
      console.error('Error fetching from blockchain:', error);
      throw new Error(`Failed to fetch IP Asset ${ipId} - Asset may not exist or is not accessible`);
    }
  }

  async getIPRelationships(ipId: string): Promise<IPRelationship[]> {
    try {
      const endpoints = [
        `${this.apiBaseUrl}/assets/${ipId}/relationships`,
        `${this.apiBaseUrl}/ip-assets/${ipId}/relationships`,
        `${this.apiBaseUrl}/v1/assets/${ipId}/relationships`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.apiHeaders,
            timeout: 10000
          });

          return response.data.map((rel: any) => ({
            type: rel.type,
            source: rel.source,
            target: rel.target,
            name: rel.name,
            owner: rel.owner,
            revenue: rel.revenue,
            derivatives: rel.derivatives,
            licenseType: rel.licenseType,
            royaltyRate: rel.royaltyRate,
            createdAt: rel.createdAt
          }));
        } catch (endpointError) {
          continue;
        }
      }
      
      throw new Error('All relationship endpoints failed');
    } catch (error) {
      console.error('Error fetching IP relationships:', error);
      // Return empty array instead of throwing error for relationships
      return [];
    }
  }

  // src/popup/modules/story-api.ts

// Tambahkan method ini ke dalam class StoryAPI

async getRandomIP(): Promise<string> {
  try {
    console.log('Fetching IP addresses from Story Explorer page...');
    
    const response = await fetch('https://aeneid.explorer.story.foundation/ipa', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Received HTML content, length:', html.length);
    
    // Extract IP addresses using multiple patterns
    const ipAddresses = this.extractIPAddressesFromHTML(html);
    
    if (ipAddresses.length === 0) {
      throw new Error('No IP addresses found on the page');
    }
    
    console.log(`Found ${ipAddresses.length} unique IP addresses`);
    
    // Pick random IP address
    const randomIndex = Math.floor(Math.random() * ipAddresses.length);
    const selectedIP = ipAddresses[randomIndex];
    
    console.log('Selected random IP:', selectedIP);
    return selectedIP;
    
  } catch (error) {
    console.error('Error fetching from Story Explorer page:', error);
    throw new Error(`Failed to fetch IP addresses from Story Explorer: ${error.message}`);
  }
}

private extractIPAddressesFromHTML(html: string): string[] {
  console.log('Extracting IP addresses from HTML...');
  
  const ipAddresses = new Set<string>();
  
  // Pattern 1: Standard Ethereum address format
  const ethereumAddressRegex = /0x[a-fA-F0-9]{40}/g;
  const matches = html.match(ethereumAddressRegex);
  
  if (matches) {
    matches.forEach(address => {
      if (this.isValidEthereumAddress(address)) {
        ipAddresses.add(address);
      }
    });
  }
  
  // Pattern 2: Addresses in href attributes
  const hrefRegex = /href="[^"]*\/ipa\/([0x[a-fA-F0-9]{40})[^"]*"/g;
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(html)) !== null) {
    const address = hrefMatch[1];
    if (this.isValidEthereumAddress(address)) {
      ipAddresses.add(address);
    }
  }
  
  // Pattern 3: Addresses in data attributes
  const dataRegex = /data-[^=]*="[^"]*([0x[a-fA-F0-9]{40})[^"]*"/g;
  let dataMatch;
  while ((dataMatch = dataRegex.exec(html)) !== null) {
    const address = dataMatch[1];
    if (this.isValidEthereumAddress(address)) {
      ipAddresses.add(address);
    }
  }
  
  // Pattern 4: Addresses in table cells or divs
  const cellRegex = /<(?:td|div)[^>]*>([^<]*0x[a-fA-F0-9]{40}[^<]*)<\/(?:td|div)>/g;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(html)) !== null) {
    const cellContent = cellMatch[1];
    const addressMatch = cellContent.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch && this.isValidEthereumAddress(addressMatch[0])) {
      ipAddresses.add(addressMatch[0]);
    }
  }
  
  // Pattern 5: JSON data embedded in script tags
  const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const scriptContent = scriptMatch[1];
    const jsonAddresses = scriptContent.match(/0x[a-fA-F0-9]{40}/g);
    if (jsonAddresses) {
      jsonAddresses.forEach(address => {
        if (this.isValidEthereumAddress(address)) {
          ipAddresses.add(address);
        }
      });
    }
  }
  
  const uniqueAddresses = Array.from(ipAddresses);
  console.log('Extracted addresses:', uniqueAddresses);
  
  return uniqueAddresses;
}

private isValidEthereumAddress(address: string): boolean {
  // Check format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return false;
  }
  
  // Exclude common non-IP addresses (zero address, common contracts)
  const excludedAddresses = [
    '0x0000000000000000000000000000000000000000', // Zero address
    '0x000000000000000000000000000000000000dead', // Burn address
    '0x1111111111111111111111111111111111111111', // Common placeholder
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH placeholder
  ];
  
  if (excludedAddresses.includes(address.toLowerCase())) {
    return false;
  }
  
  return true;
}

// Method yang sudah ada sebelumnya - pastikan ada
private extractIPAssetsFromResponse(data: any): any[] {
  console.log('Extracting IP assets from response:', data);
  
  if (Array.isArray(data)) {
    return data;
  }
  
  // Check common response wrapper patterns
  const wrapperKeys = ['data', 'items', 'results', 'assets', 'ipa', 'ipAssets', 'list'];
  
  for (const key of wrapperKeys) {
    if (data[key] && Array.isArray(data[key])) {
      console.log(`Found IP assets in '${key}' field:`, data[key].length);
      return data[key];
    }
  }
  
  console.log('No array found in response');
  return [];
}

private extractIPIdFromAsset(asset: any): string | null {
  console.log('Extracting IP ID from asset:', asset);
  
  // Coba berbagai field yang mungkin berisi IP ID
  const possibleIdFields = [
    'id',
    'ipId', 
    'ip_id',
    'address',
    'ipAssetId',
    'ip_asset_id',
    'contractAddress',
    'contract_address',
    'assetAddress',
    'asset_address',
    'tokenAddress',
    'token_address',
    'hash'
  ];
  
  for (const field of possibleIdFields) {
    const value = asset[field];
    if (value && typeof value === 'string') {
      // Validate Ethereum address format
      if (/^0x[a-fA-F0-9]{40}$/i.test(value)) {
        console.log(`Found valid IP ID in field '${field}':`, value);
        return value;
      }
    }
  }
  
  // Jika asset adalah string langsung (untuk HTML scraping)
  if (typeof asset === 'string' && /^0x[a-fA-F0-9]{40}$/i.test(asset)) {
    return asset;
  }
  
  console.warn('No valid IP ID found in asset:', asset);
  return null;
}

  async getRevenueData(ipId: string): Promise<RevenueData> {
    try {
      const endpoints = [
        `${this.apiBaseUrl}/assets/${ipId}/revenue`,
        `${this.apiBaseUrl}/ip-assets/${ipId}/revenue`,
        `${this.apiBaseUrl}/v1/assets/${ipId}/revenue`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.apiHeaders,
            timeout: 10000
          });

          const revenueData = response.data;
          
          return {
            totalRevenue: revenueData.totalRevenue || 0,
            monthlyRevenue: revenueData.monthlyRevenue || [],
            topEarningDerivatives: revenueData.topEarningDerivatives || [],
            revenueBreakdown: revenueData.revenueBreakdown || {
              directSales: 0,
              royalties: 0,
              licensing: 0
            }
          };
        } catch (endpointError) {
          continue;
        }
      }
      
      throw new Error('All revenue endpoints failed');
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Return default revenue data instead of throwing
      return {
        totalRevenue: 0,
        monthlyRevenue: [],
        topEarningDerivatives: [],
        revenueBreakdown: {
          directSales: 0,
          royalties: 0,
          licensing: 0
        }
      };
    }
  }

  async searchIPAssets(query: string): Promise<IPAssetData[]> {
    try {
      const endpoints = [
        `${this.apiBaseUrl}/assets/search`,
        `${this.apiBaseUrl}/ip-assets/search`,
        `${this.apiBaseUrl}/search/assets`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.apiHeaders,
            params: { q: query, limit: 10 },
            timeout: 10000
          });

          return response.data.map((asset: any) => ({
            id: asset.id,
            name: asset.name || asset.metadata?.title,
            owner: asset.owner,
            type: asset.type,
            revenue: asset.revenue || 0,
            derivatives: asset.derivatives || 0,
            totalRevenue: asset.totalRevenue || 0,
            tags: asset.tags || [],
            metadata: asset.metadata
          }));
        } catch (endpointError) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error searching IP assets:', error);
      return [];
    }
  }

  // Rest of the methods remain the same...
  async getIPAnalytics(ipId: string): Promise<any> {
    try {
      const [revenueData, relationships] = await Promise.all([
        this.getRevenueData(ipId),
        this.getIPRelationships(ipId)
      ]);

      return {
        totalRevenue: revenueData.totalRevenue,
        totalDerivatives: relationships.filter(r => r.type === 'derivative').length,
        monthlyRevenue: revenueData.monthlyRevenue,
        topDerivatives: revenueData.topEarningDerivatives,
        revenueGrowth: this.calculateRevenueGrowth(revenueData.monthlyRevenue),
        licenseTypes: relationships.map(r => r.licenseType).filter(Boolean),
        averageRoyaltyRate: relationships.reduce((sum, r) => sum + (r.royaltyRate || 0), 0) / relationships.length,
        creationTrend: this.generateCreationTrend(relationships)
      };
    } catch (error) {
      console.error('Error fetching IP analytics:', error);
      throw error;
    }
  }

  private calculateRevenueGrowth(monthlyRevenue: number[]): number {
    if (monthlyRevenue.length < 2) return 0;
    const recent = monthlyRevenue.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = monthlyRevenue.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  }

  private generateCreationTrend(relationships: IPRelationship[]): Array<{month: string, count: number}> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      count: Math.floor(Math.random() * 5)
    }));
  }

  isValidIPId(ipId: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(ipId);
  }

  getNetworkInfo(): { name: string; chainId: string; explorer: string } {
    return {
      name: 'Story Aeneid Testnet',
      chainId: '1315',
      explorer: 'https://aeneid.storyscan.io'
    };
  }

  async getEcosystemOverview(): Promise<{
    totalIPs: number;
    totalRevenue: number;
    totalDerivatives: number;
    topPerformers: IPAssetData[];
    recentActivity: Array<{type: string, ipId: string, timestamp: string}>;
  }> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/ecosystem/overview`, {
        headers: this.apiHeaders,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching ecosystem overview:', error);
      return {
        totalIPs: 0,
        totalRevenue: 0,
        totalDerivatives: 0,
        topPerformers: [],
        recentActivity: []
      };
    }
  }
}