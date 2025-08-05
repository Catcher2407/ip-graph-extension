// src/popup/modules/story-api.ts
interface IPAssetData {
  id: string;
  name?: string;
  owner?: string;
  type?: string;
  revenue?: number;
  derivatives?: number;
  metadata?: any;
}

interface IPRelationship {
  type: 'parent' | 'derivative' | 'license';
  source: string;
  target: string;
  name?: string;
  owner?: string;
  revenue?: number;
  derivatives?: number;
}

export class StoryAPI {
  private mockDatabase: Map<string, IPAssetData> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Create a network of connected IP assets
    const mockIPs = [
      {
        id: '0x1234567890123456789012345678901234567890',
        name: 'Original Digital Art',
        owner: '0xabcd1234567890123456789012345678901234abcd',
        type: 'Original Work',
        revenue: 150.5,
        derivatives: 3
      },
      {
        id: '0x2345678901234567890123456789012345678901',
        name: 'Remix Collection #1',
        owner: '0xbcde2345678901234567890123456789012345bcde',
        type: 'Derivative Work',
        revenue: 45.2,
        derivatives: 1
      },
      {
        id: '0x3456789012345678901234567890123456789012',
        name: 'Commercial License',
        owner: '0xcdef3456789012345678901234567890123456cdef',
        type: 'License',
        revenue: 89.7,
        derivatives: 0
      },
      {
        id: '0x4567890123456789012345678901234567890123',
        name: 'NFT Collection Base',
        owner: '0xdefa4567890123456789012345678901234567defa',
        type: 'Original Work',
        revenue: 234.8,
        derivatives: 5
      },
      {
        id: '0x5678901234567890123456789012345678901234',
        name: 'Music Remix',
        owner: '0xefab5678901234567890123456789012345678efab',
        type: 'Derivative Work',
        revenue: 67.3,
        derivatives: 2
      }
    ];

    mockIPs.forEach(ip => {
      this.mockDatabase.set(ip.id, ip);
    });
  }

  async getIPAsset(ipId: string): Promise<IPAssetData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check if we have this IP in our mock database
    const mockIP = this.mockDatabase.get(ipId);
    if (mockIP) {
      return mockIP;
    }

    // Generate dynamic mock data for any IP ID
    const mockData: IPAssetData = {
      id: ipId,
      name: `IP Asset ${ipId.slice(0, 8)}...`,
      owner: '0x' + Math.random().toString(16).substr(2, 40),
      type: ['Original Work', 'Derivative Work', 'License'][Math.floor(Math.random() * 3)],
      revenue: Math.random() * 200,
      derivatives: Math.floor(Math.random() * 6),
      metadata: {
        title: `Sample IP Asset ${ipId.slice(0, 8)}`,
        description: 'This is a sample IP Asset for demonstration',
        createdAt: new Date().toISOString(),
        tags: ['digital-art', 'nft', 'creative']
      }
    };

    return mockData;
  }

  async getIPRelationships(ipId: string): Promise<IPRelationship[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const relationships: IPRelationship[] = [];

    // Define relationship patterns for known IPs
    const relationshipMap: Record<string, IPRelationship[]> = {
      '0x1234567890123456789012345678901234567890': [
        {
          type: 'derivative',
          source: '0x1234567890123456789012345678901234567890',
          target: '0x2345678901234567890123456789012345678901',
          name: 'Remix Collection #1',
          owner: '0xbcde2345678901234567890123456789012345bcde',
          revenue: 45.2
        },
        {
          type: 'derivative',
          source: '0x1234567890123456789012345678901234567890',
          target: '0x3456789012345678901234567890123456789012',
          name: 'Commercial License',
          owner: '0xcdef3456789012345678901234567890123456cdef',
          revenue: 89.7
        },
        {
          type: 'derivative',
          source: '0x1234567890123456789012345678901234567890',
          target: '0x5678901234567890123456789012345678901234',
          name: 'Music Remix',
          owner: '0xefab5678901234567890123456789012345678efab',
          revenue: 67.3
        }
      ],
      '0x4567890123456789012345678901234567890123': [
        {
          type: 'derivative',
          source: '0x4567890123456789012345678901234567890123',
          target: '0x2345678901234567890123456789012345678901',
          name: 'Remix Collection #1',
          owner: '0xbcde2345678901234567890123456789012345bcde',
          revenue: 45.2
        },
        {
          type: 'derivative',
          source: '0x4567890123456789012345678901234567890123',
          target: '0x5678901234567890123456789012345678901234',
          name: 'Music Remix',
          owner: '0xefab5678901234567890123456789012345678efab',
          revenue: 67.3
        }
      ]
    };

    if (relationshipMap[ipId]) {
      return relationshipMap[ipId];
    }

    // Generate random relationships for other IPs
    const relationshipCount = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < relationshipCount; i++) {
      const isParent = Math.random() > 0.7;
      const relatedId = '0x' + Math.random().toString(16).substr(2, 40);
      
      relationships.push({
        type: isParent ? 'parent' : 'derivative',
        source: isParent ? relatedId : ipId,
        target: isParent ? ipId : relatedId,
        name: `${isParent ? 'Parent' : 'Derivative'} IP ${i + 1}`,
        owner: '0x' + Math.random().toString(16).substr(2, 40),
        revenue: Math.random() * 100,
        derivatives: Math.floor(Math.random() * 3)
      });
    }

    return relationships;
  }

  async getRandomIP(): Promise<string> {
    const knownIPs = Array.from(this.mockDatabase.keys());
    return knownIPs[Math.floor(Math.random() * knownIPs.length)];
  }

  async searchIPAssets(query: string): Promise<IPAssetData[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const results: IPAssetData[] = [];
    
    // Search in mock database
    for (const [id, asset] of this.mockDatabase) {
      if (id.toLowerCase().includes(query.toLowerCase()) || 
          asset.name?.toLowerCase().includes(query.toLowerCase())) {
        results.push(asset);
      }
    }
    
    // Add some random results if not enough found
    while (results.length < 3) {
      results.push({
        id: '0x' + Math.random().toString(16).substr(2, 40),
        name: `Search Result ${results.length + 1}`,
        owner: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'IP Asset',
        revenue: Math.random() * 100,
        derivatives: Math.floor(Math.random() * 5)
      });
    }
    
    return results.slice(0, 5); // Return max 5 results
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
}