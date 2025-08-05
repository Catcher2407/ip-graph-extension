// src/popup/modules/story-api.ts
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
  private mockDatabase: Map<string, IPAssetData> = new Map();
  private relationshipDatabase: Map<string, IPRelationship[]> = new Map();
  private revenueDatabase: Map<string, RevenueData> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Create comprehensive IP ecosystem
    const mockIPs = [
      {
        id: '0x1234567890123456789012345678901234567890',
        name: 'Digital Art Masterpiece',
        owner: '0xabcd1234567890123456789012345678901234abcd',
        type: 'Original Artwork',
        revenue: 2450.75,
        derivatives: 8,
        createdAt: '2024-01-15T10:30:00Z',
        totalRevenue: 3200.50,
        monthlyRevenue: [150, 280, 420, 380, 290, 310, 450, 380, 290, 310, 280, 250],
        licenseTerms: ['Commercial Use', 'Attribution Required', 'Share Alike'],
        tags: ['digital-art', 'nft', 'collectible', 'original']
      },
      {
        id: '0x2345678901234567890123456789012345678901',
        name: 'Remix Collection #1',
        owner: '0xbcde2345678901234567890123456789012345bcde',
        type: 'Derivative Work',
        revenue: 890.25,
        derivatives: 3,
        createdAt: '2024-02-20T14:15:00Z',
        totalRevenue: 1150.80,
        monthlyRevenue: [0, 120, 180, 150, 140, 160, 200, 150, 120, 80, 60, 40],
        licenseTerms: ['Non-Commercial', 'Attribution Required'],
        tags: ['remix', 'derivative', 'music', 'creative']
      },
      {
        id: '0x3456789012345678901234567890123456789012',
        name: 'Commercial License Pro',
        owner: '0xcdef3456789012345678901234567890123456cdef',
        type: 'License Agreement',
        revenue: 1580.90,
        derivatives: 0,
        createdAt: '2024-01-28T09:45:00Z',
        totalRevenue: 1580.90,
        monthlyRevenue: [200, 180, 160, 140, 120, 100, 150, 180, 200, 220, 180, 140],
        licenseTerms: ['Full Commercial Rights', 'Worldwide Distribution'],
        tags: ['license', 'commercial', 'business']
      },
      {
        id: '0x4567890123456789012345678901234567890123',
        name: 'NFT Collection Genesis',
        owner: '0xdefa4567890123456789012345678901234567defa',
        type: 'NFT Collection',
        revenue: 5240.60,
        derivatives: 12,
        createdAt: '2023-12-10T16:20:00Z',
        totalRevenue: 8900.30,
        monthlyRevenue: [800, 750, 680, 720, 650, 580, 620, 680, 720, 780, 850, 920],
        licenseTerms: ['Holder Rights', 'Commercial Use Allowed', 'Resale Rights'],
        tags: ['nft', 'collection', 'pfp', 'community']
      },
      {
        id: '0x5678901234567890123456789012345678901234',
        name: 'Music Remix Track',
        owner: '0xefab5678901234567890123456789012345678efab',
        type: 'Music Derivative',
        revenue: 670.40,
        derivatives: 2,
        createdAt: '2024-03-05T11:30:00Z',
        totalRevenue: 820.15,
        monthlyRevenue: [0, 0, 80, 120, 100, 90, 110, 130, 120, 100, 80, 60],
        licenseTerms: ['Streaming Rights', 'Attribution Required'],
        tags: ['music', 'remix', 'audio', 'streaming']
      },
      {
        id: '0x6789012345678901234567890123456789012345',
        name: 'AI Generated Art Series',
        owner: '0xfabc6789012345678901234567890123456789fabc',
        type: 'AI Generated',
        revenue: 1890.75,
        derivatives: 6,
        createdAt: '2024-01-08T13:45:00Z',
        totalRevenue: 2340.90,
        monthlyRevenue: [180, 220, 200, 180, 160, 140, 180, 200, 220, 240, 200, 180],
        licenseTerms: ['AI Disclosure Required', 'Commercial Use'],
        tags: ['ai-art', 'generated', 'series', 'technology']
      }
    ];

    // Store IP assets
    mockIPs.forEach(ip => {
      this.mockDatabase.set(ip.id, ip);
      
      // Generate revenue data
      this.revenueDatabase.set(ip.id, {
        totalRevenue: ip.totalRevenue || ip.revenue || 0,
        monthlyRevenue: ip.monthlyRevenue || [],
        topEarningDerivatives: this.generateTopEarningDerivatives(ip.derivatives || 0),
        revenueBreakdown: {
          directSales: (ip.revenue || 0) * 0.6,
          royalties: (ip.revenue || 0) * 0.3,
          licensing: (ip.revenue || 0) * 0.1
        }
      });
    });

    // Initialize relationship mappings
    this.initializeRelationships();
  }

  private generateTopEarningDerivatives(count: number): Array<{id: string, name: string, revenue: number, royaltyPaid: number}> {
    const derivatives = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const revenue = Math.random() * 500 + 50;
      derivatives.push({
        id: '0x' + Math.random().toString(16).substr(2, 40),
        name: `Top Derivative #${i + 1}`,
        revenue: revenue,
        royaltyPaid: revenue * 0.1 // 10% royalty
      });
    }
    return derivatives.sort((a, b) => b.revenue - a.revenue);
  }

  private initializeRelationships(): void {
    // Complex relationship network
    const relationships = {
      '0x1234567890123456789012345678901234567890': [
        {
          type: 'derivative' as const,
          source: '0x1234567890123456789012345678901234567890',
          target: '0x2345678901234567890123456789012345678901',
          name: 'Remix Collection #1',
          owner: '0xbcde2345678901234567890123456789012345bcde',
          revenue: 890.25,
          licenseType: 'Creative Commons',
          royaltyRate: 0.15,
          createdAt: '2024-02-20T14:15:00Z'
        },
        {
          type: 'license' as const,
          source: '0x1234567890123456789012345678901234567890',
          target: '0x3456789012345678901234567890123456789012',
          name: 'Commercial License Pro',
          owner: '0xcdef3456789012345678901234567890123456cdef',
          revenue: 1580.90,
          licenseType: 'Commercial',
          royaltyRate: 0.20,
          createdAt: '2024-01-28T09:45:00Z'
        },
        {
          type: 'derivative' as const,
          source: '0x1234567890123456789012345678901234567890',
          target: '0x5678901234567890123456789012345678901234',
          name: 'Music Remix Track',
          owner: '0xefab5678901234567890123456789012345678efab',
          revenue: 670.40,
          licenseType: 'Attribution',
          royaltyRate: 0.12,
          createdAt: '2024-03-05T11:30:00Z'
        }
      ],
      '0x4567890123456789012345678901234567890123': [
        {
          type: 'derivative' as const,
          source: '0x4567890123456789012345678901234567890123',
          target: '0x6789012345678901234567890123456789012345',
          name: 'AI Generated Art Series',
          owner: '0xfabc6789012345678901234567890123456789fabc',
          revenue: 1890.75,
          licenseType: 'AI Commons',
          royaltyRate: 0.18,
          createdAt: '2024-01-08T13:45:00Z'
        }
      ],
      '0x6789012345678901234567890123456789012345': [
        {
          type: 'parent' as const,
          source: '0x4567890123456789012345678901234567890123',
          target: '0x6789012345678901234567890123456789012345',
          name: 'NFT Collection Genesis',
          owner: '0xdefa4567890123456789012345678901234567defa',
          revenue: 5240.60,
          licenseType: 'NFT Rights',
          royaltyRate: 0.25,
          createdAt: '2023-12-10T16:20:00Z'
        }
      ]
    };

    // Store relationships
    Object.entries(relationships).forEach(([ipId, rels]) => {
      this.relationshipDatabase.set(ipId, rels);
    });
  }

  async getIPAsset(ipId: string): Promise<IPAssetData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
    // Check if we have this IP in our mock database
    const mockIP = this.mockDatabase.get(ipId);
    if (mockIP) {
      return mockIP;
    }

    // Generate dynamic mock data for unknown IPs
    const types = ['Original Artwork', 'Derivative Work', 'License Agreement', 'NFT Collection', 'Music Track', 'AI Generated'];
    const mockData: IPAssetData = {
      id: ipId,
      name: `IP Asset ${ipId.slice(0, 8)}...`,
      owner: '0x' + Math.random().toString(16).substr(2, 40),
      type: types[Math.floor(Math.random() * types.length)],
      revenue: Math.random() * 1000,
      derivatives: Math.floor(Math.random() * 8),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      totalRevenue: Math.random() * 1500,
      monthlyRevenue: Array.from({length: 12}, () => Math.random() * 200),
      licenseTerms: ['Standard License', 'Attribution Required'],
      tags: ['generated', 'mock', 'test'],
      metadata: {
        title: `Sample IP Asset ${ipId.slice(0, 8)}`,
        description: 'This is a dynamically generated IP Asset for demonstration',
        createdAt: new Date().toISOString(),
        tags: ['digital', 'blockchain', 'ip']
      }
    };

    return mockData;
  }

  async getIPRelationships(ipId: string): Promise<IPRelationship[]> {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
    
    // Check for predefined relationships
    const relationships = this.relationshipDatabase.get(ipId);
    if (relationships) {
      return relationships;
    }

    // Generate random relationships for unknown IPs
    const relationshipTypes: Array<'parent' | 'derivative' | 'license' | 'remix' | 'commercial'> = 
      ['parent', 'derivative', 'license', 'remix', 'commercial'];
    const generatedRelationships: IPRelationship[] = [];
    const relationshipCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < relationshipCount; i++) {
      const type = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];
      const isParent = type === 'parent';
      const relatedId = '0x' + Math.random().toString(16).substr(2, 40);
      
      generatedRelationships.push({
        type,
        source: isParent ? relatedId : ipId,
        target: isParent ? ipId : relatedId,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
        owner: '0x' + Math.random().toString(16).substr(2, 40),
        revenue: Math.random() * 500,
        derivatives: Math.floor(Math.random() * 4),
        licenseType: ['Creative Commons', 'Commercial', 'Attribution', 'Share Alike'][Math.floor(Math.random() * 4)],
        royaltyRate: Math.random() * 0.3,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return generatedRelationships;
  }

  async getRevenueData(ipId: string): Promise<RevenueData> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const revenueData = this.revenueDatabase.get(ipId);
    if (revenueData) {
      return revenueData;
    }

    // Generate mock revenue data
    const totalRevenue = Math.random() * 2000;
    return {
      totalRevenue,
      monthlyRevenue: Array.from({length: 12}, () => Math.random() * 200),
      topEarningDerivatives: this.generateTopEarningDerivatives(Math.floor(Math.random() * 5)),
      revenueBreakdown: {
        directSales: totalRevenue * 0.6,
        royalties: totalRevenue * 0.3,
        licensing: totalRevenue * 0.1
      }
    };
  }

  async getRandomIP(): Promise<string> {
    const knownIPs = Array.from(this.mockDatabase.keys());
    return knownIPs[Math.floor(Math.random() * knownIPs.length)];
  }

  async searchIPAssets(query: string): Promise<IPAssetData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const results: IPAssetData[] = [];
    
    // Search in mock database
    for (const [id, asset] of this.mockDatabase) {
      if (id.toLowerCase().includes(query.toLowerCase()) || 
          asset.name?.toLowerCase().includes(query.toLowerCase()) ||
          asset.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
        results.push(asset);
      }
    }
    
    // Add some random results if not enough found
    while (results.length < 3) {
      const randomRevenue = Math.random() * 1000;
      results.push({
        id: '0x' + Math.random().toString(16).substr(2, 40),
        name: `Search Result ${results.length + 1}`,
        owner: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'IP Asset',
        revenue: randomRevenue,
        derivatives: Math.floor(Math.random() * 5),
        totalRevenue: randomRevenue * 1.2,
        tags: ['search', 'result', 'mock']
      });
    }
    
    return results.slice(0, 5);
  }

  async getIPAnalytics(ipId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const revenueData = await this.getRevenueData(ipId);
    const relationships = await this.getIPRelationships(ipId);
    
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

  // New method for getting IP ecosystem overview
  async getEcosystemOverview(): Promise<{
    totalIPs: number;
    totalRevenue: number;
    totalDerivatives: number;
    topPerformers: IPAssetData[];
    recentActivity: Array<{type: string, ipId: string, timestamp: string}>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const allIPs = Array.from(this.mockDatabase.values());
    const totalRevenue = allIPs.reduce((sum, ip) => sum + (ip.totalRevenue || 0), 0);
    const totalDerivatives = allIPs.reduce((sum, ip) => sum + (ip.derivatives || 0), 0);
    
    return {
      totalIPs: allIPs.length,
      totalRevenue,
      totalDerivatives,
      topPerformers: allIPs.sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 3),
      recentActivity: [
        { type: 'derivative_created', ipId: '0x1234567890123456789012345678901234567890', timestamp: new Date().toISOString() },
        { type: 'license_granted', ipId: '0x4567890123456789012345678901234567890123', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { type: 'revenue_received', ipId: '0x2345678901234567890123456789012345678901', timestamp: new Date(Date.now() - 7200000).toISOString() }
      ]
    };
  }
}