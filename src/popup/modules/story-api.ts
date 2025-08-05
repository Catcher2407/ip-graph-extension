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
    console.log('Fetching IP addresses from Story Explorer web page...');
    
    const response = await fetch('https://aeneid.explorer.story.foundation/ipa', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('HTML received, length:', html.length);
    
    // Debug: Save HTML to see structure
    console.log('HTML preview (first 2000 chars):', html.substring(0, 2000));
    
    // Try different extraction methods
    const addresses = this.extractAddressesFromStoryExplorer(html);
    
    if (addresses.length === 0) {
      // If no addresses found, try to extract from any script tags or data
      const scriptAddresses = this.extractFromScriptTags(html);
      if (scriptAddresses.length > 0) {
        addresses.push(...scriptAddresses);
      }
    }
    
    if (addresses.length === 0) {
      // Last resort: look for any 0x pattern
      const anyAddresses = this.extractAnyHexPatterns(html);
      if (anyAddresses.length > 0) {
        addresses.push(...anyAddresses);
      }
    }
    
    if (addresses.length === 0) {
      console.error('No addresses found. HTML structure might be different.');
      console.log('Full HTML content:', html);
      throw new Error('No IP addresses found on the Story Explorer page');
    }
    
    console.log(`Found ${addresses.length} IP addresses:`, addresses);
    
    // Return random address
    const randomIndex = Math.floor(Math.random() * addresses.length);
    const selectedAddress = addresses[randomIndex];
    
    console.log('Selected random IP address:', selectedAddress);
    return selectedAddress;
    
  } catch (error) {
    console.error('Error fetching from Story Explorer:', error);
    throw new Error(`Failed to fetch IP addresses from Story Explorer: ${error.message}`);
  }
}

private extractAddressesFromStoryExplorer(html: string): string[] {
  const addresses = new Set<string>();
  
  console.log('Extracting addresses using Story Explorer specific patterns...');
  
  // Pattern 1: Look for table rows with addresses
  const tableRowRegex = /<tr[^>]*>.*?<td[^>]*>.*?(0x[a-fA-F0-9]{40}).*?<\/td>.*?<\/tr>/gs;
  let match;
  while ((match = tableRowRegex.exec(html)) !== null) {
    const address = match[1];
    if (this.isValidIPAddress(address)) {
      addresses.add(address);
      console.log('Found address in table row:', address);
    }
  }
  
  // Pattern 2: Look for links to IP assets
  const linkRegex = /<a[^>]*href="[^"]*\/ipa\/([0x[a-fA-F0-9]{40})"[^>]*>/g;
  while ((match = linkRegex.exec(html)) !== null) {
    const address = match[1];
    if (this.isValidIPAddress(address)) {
      addresses.add(address);
      console.log('Found address in link:', address);
    }
  }
  
  // Pattern 3: Look for div elements with address data
  const divRegex = /<div[^>]*(?:class="[^"]*address[^"]*"|data-address="([^"]*)").*?>(.*?0x[a-fA-F0-9]{40}.*?)<\/div>/gs;
  while ((match = divRegex.exec(html)) !== null) {
    const addressInAttr = match[1];
    const addressInContent = match[2];
    
    if (addressInAttr && this.isValidIPAddress(addressInAttr)) {
      addresses.add(addressInAttr);
      console.log('Found address in div attribute:', addressInAttr);
    }
    
    const contentMatch = addressInContent.match(/0x[a-fA-F0-9]{40}/);
    if (contentMatch && this.isValidIPAddress(contentMatch[0])) {
      addresses.add(contentMatch[0]);
      console.log('Found address in div content:', contentMatch[0]);
    }
  }
  
  // Pattern 4: Look for any element with address-like content
  const generalRegex = /<[^>]*>(.*?0x[a-fA-F0-9]{40}.*?)<\/[^>]*>/g;
  while ((match = generalRegex.exec(html)) !== null) {
    const content = match[1];
    const addressMatch = content.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch && this.isValidIPAddress(addressMatch[0])) {
      addresses.add(addressMatch[0]);
      console.log('Found address in general element:', addressMatch[0]);
    }
  }
  
  return Array.from(addresses);
}

private extractFromScriptTags(html: string): string[] {
  const addresses = new Set<string>();
  
  console.log('Extracting addresses from script tags...');
  
  // Find all script tags
  const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    
    // Look for addresses in JavaScript code
    const jsAddressRegex = /['"`](0x[a-fA-F0-9]{40})['"`]/g;
    let jsMatch;
    
    while ((jsMatch = jsAddressRegex.exec(scriptContent)) !== null) {
      const address = jsMatch[1];
      if (this.isValidIPAddress(address)) {
        addresses.add(address);
        console.log('Found address in script:', address);
      }
    }
    
    // Look for JSON-like structures
    const jsonRegex = /"(?:address|id|ipId|contractAddress)":\s*"(0x[a-fA-F0-9]{40})"/g;
    while ((jsMatch = jsonRegex.exec(scriptContent)) !== null) {
      const address = jsMatch[1];
      if (this.isValidIPAddress(address)) {
        addresses.add(address);
        console.log('Found address in JSON structure:', address);
      }
    }
  }
  
  return Array.from(addresses);
}

private extractAnyHexPatterns(html: string): string[] {
  const addresses = new Set<string>();
  
  console.log('Extracting any hex patterns that look like addresses...');
  
  // Remove HTML tags and get plain text
  const plainText = html.replace(/<[^>]*>/g, ' ');
  
  // Find all 0x patterns
  const hexRegex = /0x[a-fA-F0-9]{40}/g;
  const matches = plainText.match(hexRegex);
  
  if (matches) {
    matches.forEach(address => {
      if (this.isValidIPAddress(address)) {
        addresses.add(address);
        console.log('Found address in plain text:', address);
      }
    });
  }
  
  return Array.from(addresses);
}

private isValidIPAddress(address: string): boolean {
  // Basic format check
  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return false;
  }
  
  // Exclude obvious non-IP addresses
  const excludedAddresses = [
    '0x0000000000000000000000000000000000000000', // Zero address
    '0x000000000000000000000000000000000000dead', // Burn address
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH placeholder
  ];
  
  return !excludedAddresses.includes(address.toLowerCase());
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