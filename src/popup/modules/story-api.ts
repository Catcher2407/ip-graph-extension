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
  private apiBaseUrl = 'https://api.storyapis.com/assets';
  private rpcUrl = 'https://aeneid.storyrpc.io';
  private apiHeaders = {
    'X-CHAIN': 'story-aeneid', // untuk testnet, gunakan 'story' untuk mainnet
    'X-API-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
    'Content-Type': 'application/json'
  };

  constructor() {
    // No initialization needed
  }

  async getIPAsset(ipId: string): Promise<IPAssetData> {
    try {
      // Berdasarkan dokumentasi, endpoint yang benar adalah tanpa /api/v1/
      const response = await axios.get(`${this.apiBaseUrl}/assets/${ipId}`, {
        headers: this.apiHeaders
      });

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
    } catch (error) {
      console.error('Error fetching IP Asset from API:', error);
      
      // Jika API gagal, coba ambil data dari blockchain langsung
      return this.getIPAssetFromBlockchain(ipId);
    }
  }

  private async getIPAssetFromBlockchain(ipId: string): Promise<IPAssetData> {
    try {
      // Gunakan RPC call langsung ke Story blockchain
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: ipId,
            data: '0x06fdde03' // name() function selector
          },
          'latest'
        ],
        id: 1
      });

      if (response.data.result && response.data.result !== '0x') {
        // Parse hasil dari blockchain
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
            image: 'https://via.placeholder.com/300x300?text=Story+IP'
          }
        };
      }
      
      throw new Error('No data found on blockchain');
    } catch (error) {
      console.error('Error fetching from blockchain:', error);
      throw new Error(`Failed to fetch IP Asset ${ipId} - Asset may not exist`);
    }
  }

  async getIPRelationships(ipId: string): Promise<IPRelationship[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/assets/${ipId}/relationships`, {
        headers: this.apiHeaders
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
    } catch (error) {
      console.error('Error fetching IP relationships:', error);
      throw new Error(`Failed to fetch relationships for IP Asset ${ipId}`);
    }
  }

  async getRandomIP(): Promise<string> {
    // Gunakan IP yang benar-benar ada di Story Protocol
    const realStoryIPs = [
      '0xB1D831271A68Db5c18c8F0B69327446f7C8D0A42', // Ippy - Story's mascot (mainnet)
    ];
    
    return realStoryIPs[0]; // Return Ippy sebagai contoh yang pasti ada
  }

  async getRevenueData(ipId: string): Promise<RevenueData> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/assets/${ipId}/revenue`, {
        headers: this.apiHeaders
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
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw new Error(`Failed to fetch revenue data for IP Asset ${ipId}`);
    }
  }

  async searchIPAssets(query: string): Promise<IPAssetData[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/assets/search`, {
        headers: this.apiHeaders,
        params: { q: query, limit: 10 }
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
    } catch (error) {
      console.error('Error searching IP assets:', error);
      throw new Error('Failed to search IP assets');
    }
  }

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
        headers: this.apiHeaders
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching ecosystem overview:', error);
      throw new Error('Failed to fetch ecosystem overview');
    }
  }
}