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
  private baseUrl: string;
  private apiKey: string;
  private chainId: string;

  constructor() {
    this.baseUrl = 'https://api.storyapis.com';
    this.apiKey = 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U';
    this.chainId = 'story-aeneid'; // testnet
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'X-CHAIN': this.chainId,
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Story API request failed:', error);
      throw error;
    }
  }

  async getIPAsset(ipId: string): Promise<IPAssetData> {
    try {
      // For now, return mock data since the API structure isn't fully documented
      // In production, this would make a real API call
      const mockData: IPAssetData = {
        id: ipId,
        name: `IP Asset ${ipId.slice(0, 8)}...`,
        owner: '0x' + Math.random().toString(16).substr(2, 40),
        type: 'IP Asset',
        revenue: Math.random() * 100,
        derivatives: Math.floor(Math.random() * 5),
        metadata: {
          title: 'Sample IP Asset',
          description: 'This is a sample IP Asset for demonstration',
          createdAt: new Date().toISOString()
        }
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockData;
    } catch (error) {
      console.error('Failed to fetch IP Asset:', error);
      throw new Error('Failed to fetch IP Asset data');
    }
  }

  async getIPRelationships(ipId: string): Promise<IPRelationship[]> {
    try {
      // Mock relationships data
      const mockRelationships: IPRelationship[] = [];
      
      // Add random parent
      if (Math.random() > 0.3) {
        mockRelationships.push({
          type: 'parent',
          source: '0x' + Math.random().toString(16).substr(2, 40),
          target: ipId,
          name: 'Parent IP Asset',
          owner: '0x' + Math.random().toString(16).substr(2, 40),
          revenue: Math.random() * 200,
          derivatives: Math.floor(Math.random() * 10)
        });
      }

      // Add random derivatives
      const derivativeCount = Math.floor(Math.random() * 4);
      for (let i = 0; i < derivativeCount; i++) {
        mockRelationships.push({
          type: 'derivative',
          source: ipId,
          target: '0x' + Math.random().toString(16).substr(2, 40),
          name: `Derivative ${i + 1}`,
          owner: '0x' + Math.random().toString(16).substr(2, 40),
          revenue: Math.random() * 50,
          derivatives: Math.floor(Math.random() * 3)
        });
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return mockRelationships;
    } catch (error) {
      console.error('Failed to fetch IP relationships:', error);
      throw new Error('Failed to fetch IP relationships');
    }
  }

  async getRandomIP(): Promise<string> {
    try {
      // Return a random IP ID for demo purposes
      const randomIPs = [
        '0x1234567890123456789012345678901234567890',
        '0x2345678901234567890123456789012345678901',
        '0x3456789012345678901234567890123456789012',
        '0x4567890123456789012345678901234567890123',
        '0x5678901234567890123456789012345678901234'
      ];
      
      return randomIPs[Math.floor(Math.random() * randomIPs.length)];
    } catch (error) {
      console.error('Failed to get random IP:', error);
      throw new Error('Failed to get random IP');
    }
  }

  async searchIPAssets(query: string): Promise<IPAssetData[]> {
    try {
      // Mock search results
      const mockResults: IPAssetData[] = [];
      
      for (let i = 0; i < 3; i++) {
        mockResults.push({
          id: '0x' + Math.random().toString(16).substr(2, 40),
          name: `Search Result ${i + 1}`,
          owner: '0x' + Math.random().toString(16).substr(2, 40),
          type: 'IP Asset',
          revenue: Math.random() * 100,
          derivatives: Math.floor(Math.random() * 5)
        });
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      return mockResults;
    } catch (error) {
      console.error('Failed to search IP assets:', error);
      throw new Error('Failed to search IP assets');
    }
  }

  async getIPMetadata(ipId: string): Promise<any> {
    try {
      // Mock metadata
      const mockMetadata = {
        title: `IP Asset ${ipId.slice(0, 8)}...`,
        description: 'This is a sample IP Asset metadata',
        image: 'https://picsum.photos/200/200',
        creators: [
          {
            name: 'Creator Name',
            address: '0x' + Math.random().toString(16).substr(2, 40),
            contributionPercent: 100
          }
        ],
        createdAt: new Date().toISOString(),
        mediaType: 'image/jpeg'
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return mockMetadata;
    } catch (error) {
      console.error('Failed to fetch IP metadata:', error);
      throw new Error('Failed to fetch IP metadata');
    }
  }

  async getIPAnalytics(ipId: string): Promise<any> {
    try {
      // Mock analytics data
      const mockAnalytics = {
        totalRevenue: Math.random() * 1000,
        totalDerivatives: Math.floor(Math.random() * 20),
        monthlyRevenue: Array.from({ length: 12 }, () => Math.random() * 100),
        topDerivatives: [
          {
            id: '0x' + Math.random().toString(16).substr(2, 40),
            name: 'Top Derivative 1',
            revenue: Math.random() * 200
          },
          {
            id: '0x' + Math.random().toString(16).substr(2, 40),
            name: 'Top Derivative 2',
            revenue: Math.random() * 150
          }
        ]
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return mockAnalytics;
    } catch (error) {
      console.error('Failed to fetch IP analytics:', error);
      throw new Error('Failed to fetch IP analytics');
    }
  }

  // Utility method to validate IP ID format
  isValidIPId(ipId: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(ipId);
  }

  // Method to get network info
  getNetworkInfo(): { name: string; chainId: string; explorer: string } {
    return {
      name: 'Story Aeneid Testnet',
      chainId: this.chainId,
      explorer: 'https://aeneid.storyscan.io'
    };
  }
}