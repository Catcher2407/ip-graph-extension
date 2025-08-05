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

  async getRandomIP(): Promise<string> {
  try {
    console.log('Fetching random IP from Story Explorer...');
    
    // Fetch data dari Story Explorer
    const response = await fetch('https://aeneid.explorer.story.foundation/ipa', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'IP-Graph-Extension/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Story Explorer response:', data);
    
    // Extract IP assets dari response
    let ipAssets = [];
    
    if (Array.isArray(data)) {
      ipAssets = data;
    } else if (data.data && Array.isArray(data.data)) {
      ipAssets = data.data;
    } else if (data.items && Array.isArray(data.items)) {
      ipAssets = data.items;
    } else if (data.results && Array.isArray(data.results)) {
      ipAssets = data.results;
    } else {
      console.log('Unexpected response format:', data);
      throw new Error('No IP assets array found in response');
    }
    
    if (ipAssets.length === 0) {
      throw new Error('No IP assets found in explorer');
    }
    
    // Pilih IP asset secara random
    const randomIndex = Math.floor(Math.random() * ipAssets.length);
    const selectedAsset = ipAssets[randomIndex];
    
    console.log('Selected asset:', selectedAsset);
    
    // Extract IP ID dari asset
    const ipId = this.extractIPIdFromAsset(selectedAsset);
    
    if (!ipId) {
      throw new Error('Could not extract valid IP ID from selected asset');
    }
    
    console.log('Selected random IP from Story Explorer:', ipId);
    return ipId;
    
  } catch (error) {
    console.error('Error fetching from Story Explorer:', error);
    throw new Error(`Failed to fetch random IP from Story Explorer: ${error.message}`);
  }
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
    'token_address'
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
  
  // Jika tidak ada field langsung, coba nested objects
  if (asset.contract && typeof asset.contract === 'object') {
    const contractId = this.extractIPIdFromAsset(asset.contract);
    if (contractId) return contractId;
  }
  
  if (asset.token && typeof asset.token === 'object') {
    const tokenId = this.extractIPIdFromAsset(asset.token);
    if (tokenId) return tokenId;
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