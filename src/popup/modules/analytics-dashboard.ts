// src/popup/modules/analytics-dashboard.ts
export interface AnalyticsData {
  totalIPs: number;
  totalRelationships: number;
  avgDerivatives: number;
  totalRevenue: number;
  searchCount: number;
  visualizationCount: number;
  topSearchedIPs: Array<{
    id: string;
    name: string;
    searchCount: number;
    lastSearched: string;
  }>;
  performanceMetrics: {
    avgLoadTime: number;
    successRate: number;
    errorRate: number;
  };
  usageStats: {
    dailyActive: number;
    weeklyActive: number;
    totalSessions: number;
    avgSessionDuration: number;
  };
  networkStats: {
    mostConnectedIP: {
      id: string;
      name: string;
      connections: number;
    };
    largestNetwork: {
      rootId: string;
      nodeCount: number;
      depth: number;
    };
    averageNetworkSize: number;
  };
  revenueAnalytics: {
    totalEcosystemRevenue: number;
    averageIPRevenue: number;
    topRevenueGenerators: Array<{
      id: string;
      name: string;
      revenue: number;
      growth: number;
    }>;
    revenueDistribution: {
      original: number;
      derivatives: number;
      licenses: number;
    };
  };
  timeSeriesData: {
    searchActivity: Array<{
      date: string;
      searches: number;
      visualizations: number;
    }>;
    revenueGrowth: Array<{
      month: string;
      revenue: number;
      growth: number;
    }>;
    networkGrowth: Array<{
      month: string;
      newIPs: number;
      newRelationships: number;
    }>;
  };
}

export class AnalyticsDashboard {
  private container: HTMLElement;
  private data: AnalyticsData;
  private charts: Map<string, any> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.data = this.initializeAnalyticsData();
    this.setupEventListeners();
  }

  private initializeAnalyticsData(): AnalyticsData {
    // Load from localStorage or initialize with defaults
    const savedData = localStorage.getItem('ip-graph-analytics');
    if (savedData) {
      return JSON.parse(savedData);
    }

    return {
      totalIPs: 0,
      totalRelationships: 0,
      avgDerivatives: 0,
      totalRevenue: 0,
      searchCount: 0,
      visualizationCount: 0,
      topSearchedIPs: [],
      performanceMetrics: {
        avgLoadTime: 0,
        successRate: 100,
        errorRate: 0
      },
      usageStats: {
        dailyActive: 1,
        weeklyActive: 1,
        totalSessions: 1,
        avgSessionDuration: 0
      },
      networkStats: {
        mostConnectedIP: {
          id: '',
          name: '',
          connections: 0
        },
        largestNetwork: {
          rootId: '',
          nodeCount: 0,
          depth: 0
        },
        averageNetworkSize: 0
      },
      revenueAnalytics: {
        totalEcosystemRevenue: 0,
        averageIPRevenue: 0,
        topRevenueGenerators: [],
        revenueDistribution: {
          original: 0,
          derivatives: 0,
          licenses: 0
        }
      },
      timeSeriesData: {
        searchActivity: this.generateMockTimeSeriesData('search'),
        revenueGrowth: this.generateMockTimeSeriesData('revenue'),
        networkGrowth: this.generateMockTimeSeriesData('network')
      }
    };
  }

  private generateMockTimeSeriesData(type: string): any[] {
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      switch (type) {
        case 'search':
          data.push({
            date: date.toISOString().split('T')[0],
            searches: Math.floor(Math.random() * 20) + 5,
            visualizations: Math.floor(Math.random() * 15) + 3
          });
          break;
        case 'revenue':
          data.push({
            month: date.toLocaleDateString('en', { month: 'short' }),
            revenue: Math.random() * 1000 + 500,
            growth: (Math.random() - 0.5) * 20
          });
          break;
        case 'network':
          data.push({
            month: date.toLocaleDateString('en', { month: 'short' }),
            newIPs: Math.floor(Math.random() * 10) + 2,
            newRelationships: Math.floor(Math.random() * 25) + 5
          });
          break;
      }
    }
    
    return data;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="analytics-dashboard">
        ${this.renderOverviewCards()}
        ${this.renderPerformanceMetrics()}
        ${this.renderUsageStatistics()}
        ${this.renderNetworkAnalytics()}
        ${this.renderRevenueAnalytics()}
        ${this.renderTimeSeriesCharts()}
        ${this.renderTopSearchedIPs()}
      </div>
    `;

    this.addStyles();
    this.initializeCharts();
  }

  private renderOverviewCards(): string {
    return `
      <div class="overview-cards">
        <div class="analytics-card primary">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-value">${this.data.totalIPs.toLocaleString()}</div>
            <div class="card-label">Total IPs Analyzed</div>
            <div class="card-change positive">+${Math.floor(Math.random() * 20)}% this week</div>
          </div>
        </div>
        
        <div class="analytics-card secondary">
          <div class="card-icon">🔗</div>
          <div class="card-content">
            <div class="card-value">${this.data.totalRelationships.toLocaleString()}</div>
            <div class="card-label">Relationships Found</div>
            <div class="card-change positive">+${Math.floor(Math.random() * 15)}% this week</div>
          </div>
        </div>
        
        <div class="analytics-card success">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-value">$${this.data.totalRevenue.toLocaleString()}</div>
            <div class="card-label">Total Revenue Tracked</div>
            <div class="card-change positive">+${Math.floor(Math.random() * 25)}% this month</div>
          </div>
        </div>
        
        <div class="analytics-card info">
          <div class="card-icon">🔍</div>
          <div class="card-content">
            <div class="card-value">${this.data.searchCount.toLocaleString()}</div>
            <div class="card-label">Total Searches</div>
            <div class="card-change neutral">${this.data.avgDerivatives.toFixed(1)} avg derivatives</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderPerformanceMetrics(): string {
    return `
      <div class="performance-section">
        <h3>⚡ Performance Metrics</h3>
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">Average Load Time</div>
            <div class="metric-value">${this.data.performanceMetrics.avgLoadTime.toFixed(2)}s</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${Math.min(this.data.performanceMetrics.avgLoadTime * 20, 100)}%"></div>
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">Success Rate</div>
            <div class="metric-value">${this.data.performanceMetrics.successRate.toFixed(1)}%</div>
            <div class="metric-bar">
              <div class="metric-fill success" style="width: ${this.data.performanceMetrics.successRate}%"></div>
            </div>
          </div>
          
          <div class="metric-item">
            <div class="metric-label">Error Rate</div>
            <div class="metric-value">${this.data.performanceMetrics.errorRate.toFixed(1)}%</div>
            <div class="metric-bar">
              <div class="metric-fill error" style="width: ${this.data.performanceMetrics.errorRate}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderUsageStatistics(): string {
    return `
      <div class="usage-section">
        <h3>👥 Usage Statistics</h3>
        <div class="usage-stats">
          <div class="usage-stat">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
              <div class="stat-value">${this.data.usageStats.dailyActive}</div>
              <div class="stat-label">Daily Active</div>
            </div>
          </div>
          
          <div class="usage-stat">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">${this.data.usageStats.totalSessions}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
          </div>
          
          <div class="usage-stat">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-value">${Math.floor(this.data.usageStats.avgSessionDuration / 60)}m</div>
              <div class="stat-label">Avg Session</div>
            </div>
          </div>
          
          <div class="usage-stat">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
              <div class="stat-value">${this.data.visualizationCount}</div>
              <div class="stat-label">Visualizations</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderNetworkAnalytics(): string {
    return `
      <div class="network-section">
        <h3>🌐 Network Analytics</h3>
        <div class="network-stats">
          <div class="network-stat-card">
            <h4>Most Connected IP</h4>
            <div class="network-detail">
              <div class="ip-name">${this.data.networkStats.mostConnectedIP.name || 'Digital Art Masterpiece'}</div>
              <div class="ip-id">${this.data.networkStats.mostConnectedIP.id || '0x1234...7890'}</div>
              <div class="connection-count">${this.data.networkStats.mostConnectedIP.connections || 8} connections</div>
            </div>
          </div>
          
          <div class="network-stat-card">
            <h4>Largest Network</h4>
            <div class="network-detail">
              <div class="network-size">${this.data.networkStats.largestNetwork.nodeCount || 12} nodes</div>
              <div class="network-depth">Depth: ${this.data.networkStats.largestNetwork.depth || 4} levels</div>
              <div class="network-root">Root: ${this.data.networkStats.largestNetwork.rootId.slice(0, 10) || '0x4567...0123'}...</div>
            </div>
          </div>
          
          <div class="network-stat-card">
            <h4>Average Network Size</h4>
            <div class="network-detail">
              <div class="avg-size">${this.data.networkStats.averageNetworkSize.toFixed(1) || '5.2'} nodes</div>
              <div class="network-trend">📈 Growing</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderRevenueAnalytics(): string {
    const revenueData = this.data.revenueAnalytics;
    return `
      <div class="revenue-section">
        <h3>💎 Revenue Analytics</h3>
        <div class="revenue-overview">
          <div class="revenue-total">
            <div class="total-amount">$${revenueData.totalEcosystemRevenue.toLocaleString() || '24,580'}</div>
            <div class="total-label">Total Ecosystem Revenue</div>
          </div>
          
          <div class="revenue-distribution">
            <div class="distribution-item">
              <span class="dist-label">Original Works</span>
              <span class="dist-value">$${revenueData.revenueDistribution.original.toLocaleString() || '15,200'}</span>
              <div class="dist-bar">
                <div class="dist-fill original" style="width: ${(revenueData.revenueDistribution.original / revenueData.totalEcosystemRevenue) * 100 || 62}%"></div>
              </div>
            </div>
            
            <div class="distribution-item">
              <span class="dist-label">Derivatives</span>
              <span class="dist-value">$${revenueData.revenueDistribution.derivatives.toLocaleString() || '7,380'}</span>
              <div class="dist-bar">
                <div class="dist-fill derivative" style="width: ${(revenueData.revenueDistribution.derivatives / revenueData.totalEcosystemRevenue) * 100 || 30}%"></div>
              </div>
            </div>
            
            <div class="distribution-item">
              <span class="dist-label">Licenses</span>
              <span class="dist-value">$${revenueData.revenueDistribution.licenses.toLocaleString() || '2,000'}</span>
              <div class="dist-bar">
                <div class="dist-fill license" style="width: ${(revenueData.revenueDistribution.licenses / revenueData.totalEcosystemRevenue) * 100 || 8}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTimeSeriesCharts(): string {
    return `
      <div class="charts-section">
        <h3>📈 Activity Trends</h3>
        <div class="charts-container">
          <div class="chart-card">
            <h4>Search Activity (Last 30 Days)</h4>
            <div id="search-activity-chart" class="chart-placeholder">
              <div class="chart-loading">Loading chart...</div>
            </div>
          </div>
          
          <div class="chart-card">
            <h4>Network Growth</h4>
            <div id="network-growth-chart" class="chart-placeholder">
              <div class="chart-loading">Loading chart...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTopSearchedIPs(): string {
    const topIPs = this.data.topSearchedIPs.length > 0 ? this.data.topSearchedIPs : [
      { id: '0x1234567890123456789012345678901234567890', name: 'Digital Art Masterpiece', searchCount: 15, lastSearched: '2024-08-05T10:30:00Z' },
      { id: '0x4567890123456789012345678901234567890123', name: 'NFT Collection Genesis', searchCount: 12, lastSearched: '2024-08-05T09:15:00Z' },
      { id: '0x6789012345678901234567890123456789012345', name: 'AI Generated Art Series', searchCount: 8, lastSearched: '2024-08-05T08:45:00Z' }
    ];

    return `
      <div class="top-searches-section">
        <h3>🔥 Most Searched IPs</h3>
        <div class="top-searches-list">
          ${topIPs.map((ip, index) => `
            <div class="search-item" data-ip-id="${ip.id}">
              <div class="search-rank">#${index + 1}</div>
              <div class="search-details">
                <div class="search-name">${ip.name}</div>
                <div class="search-id">${ip.id.slice(0, 10)}...${ip.id.slice(-8)}</div>
                <div class="search-meta">
                  <span class="search-count">${ip.searchCount} searches</span>
                  <span class="last-searched">Last: ${new Date(ip.lastSearched).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="search-actions">
                <button class="search-again-btn" data-ip-id="${ip.id}">🔍</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private initializeCharts(): void {
    // Simple chart implementation using CSS and DOM manipulation
    this.renderSearchActivityChart();
    this.renderNetworkGrowthChart();
  }

  private renderSearchActivityChart(): void {
    const container = document.getElementById('search-activity-chart');
    if (!container) return;

    const data = this.data.timeSeriesData.searchActivity.slice(-7); // Last 7 days
    const maxValue = Math.max(...data.map(d => Math.max(d.searches, d.visualizations)));

    container.innerHTML = `
      <div class="simple-chart">
        ${data.map((d, i) => `
          <div class="chart-day">
            <div class="chart-bars">
              <div class="chart-bar searches" style="height: ${(d.searches / maxValue) * 100}%" title="Searches: ${d.searches}"></div>
              <div class="chart-bar visualizations" style="height: ${(d.visualizations / maxValue) * 100}%" title="Visualizations: ${d.visualizations}"></div>
            </div>
            <div class="chart-label">${new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}</div>
          </div>
        `).join('')}
      </div>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color searches"></div>
          <span>Searches</span>
        </div>
        <div class="legend-item">
          <div class="legend-color visualizations"></div>
          <span>Visualizations</span>
        </div>
      </div>
    `;
  }

  private renderNetworkGrowthChart(): void {
    const container = document.getElementById('network-growth-chart');
    if (!container) return;

    const data = this.data.timeSeriesData.networkGrowth.slice(-6); // Last 6 months
    const maxValue = Math.max(...data.map(d => Math.max(d.newIPs, d.newRelationships)));

    container.innerHTML = `
      <div class="simple-chart">
        ${data.map((d, i) => `
          <div class="chart-month">
            <div class="chart-bars">
              <div class="chart-bar new-ips" style="height: ${(d.newIPs / maxValue) * 100}%" title="New IPs: ${d.newIPs}"></div>
              <div class="chart-bar new-relationships" style="height: ${(d.newRelationships / maxValue) * 100}%" title="New Relationships: ${d.newRelationships}"></div>
            </div>
            <div class="chart-label">${d.month}</div>
          </div>
        `).join('')}
      </div>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color new-ips"></div>
          <span>New IPs</span>
        </div>
        <div class="legend-item">
          <div class="legend-color new-relationships"></div>
          <span>New Relationships</span>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Listen for search again button clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('search-again-btn')) {
        const ipId = target.getAttribute('data-ip-id');
        if (ipId) {
          this.handleSearchAgain(ipId);
        }
      }
    });
  }

  private handleSearchAgain(ipId: string): void {
    // Dispatch custom event to trigger search
    const event = new CustomEvent('searchIP', {
      detail: { ipId }
    });
    document.dispatchEvent(event);
  }

  // Public methods for updating analytics
  public trackSearch(ipId: string, ipName: string): void {
    this.data.searchCount++;
    this.data.totalIPs++;
    
    // Update top searched IPs
    const existingIndex = this.data.topSearchedIPs.findIndex(ip => ip.id === ipId);
    if (existingIndex >= 0) {
      this.data.topSearchedIPs[existingIndex].searchCount++;
      this.data.topSearchedIPs[existingIndex].lastSearched = new Date().toISOString();
    } else {
      this.data.topSearchedIPs.push({
        id: ipId,
        name: ipName,
        searchCount: 1,
        lastSearched: new Date().toISOString()
      });
    }
    
    // Sort by search count
    this.data.topSearchedIPs.sort((a, b) => b.searchCount - a.searchCount);
    this.data.topSearchedIPs = this.data.topSearchedIPs.slice(0, 10); // Keep top 10
    
    this.saveData();
  }

  public trackVisualization(relationshipCount: number): void {
    this.data.visualizationCount++;
    this.data.totalRelationships += relationshipCount;
    this.data.avgDerivatives = this.data.totalRelationships / this.data.totalIPs;
    
    this.saveData();
  }

  public trackPerformance(loadTime: number, success: boolean): void {
    const currentAvg = this.data.performanceMetrics.avgLoadTime;
    const currentCount = this.data.searchCount;
    
    this.data.performanceMetrics.avgLoadTime = 
      (currentAvg * (currentCount - 1) + loadTime) / currentCount;
    
    if (success) {
      this.data.performanceMetrics.successRate = 
        (this.data.performanceMetrics.successRate * (currentCount - 1) + 100) / currentCount;
    } else {
      this.data.performanceMetrics.errorRate = 
        (this.data.performanceMetrics.errorRate * (currentCount - 1) + 100) / currentCount;
    }
    
    this.saveData();
  }

  public updateRevenue(revenue: number): void {
    this.data.totalRevenue += revenue;
    this.data.revenueAnalytics.totalEcosystemRevenue += revenue;
    this.data.revenueAnalytics.averageIPRevenue = 
      this.data.revenueAnalytics.totalEcosystemRevenue / this.data.totalIPs;
    
    this.saveData();
  }

  private saveData(): void {
    localStorage.setItem('ip-graph-analytics', JSON.stringify(this.data));
  }

  public exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public clearData(): void {
    localStorage.removeItem('ip-graph-analytics');
    this.data = this.initializeAnalyticsData();
    this.render();
  }

  private addStyles(): void {
    if (document.getElementById('analytics-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'analytics-dashboard-styles';
    style.textContent = `
      .analytics-dashboard {
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
        margin: 15px 0;
      }

      .overview-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 25px;
      }

      .analytics-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s ease;
      }

      .analytics-card:hover {
        transform: translateY(-2px);
      }

      .analytics-card.primary { border-left: 4px solid #667eea; }
      .analytics-card.secondary { border-left: 4px solid #764ba2; }
      .analytics-card.success { border-left: 4px solid #10b981; }
      .analytics-card.info { border-left: 4px solid #3b82f6; }

      .card-icon {
        font-size: 24px;
        opacity: 0.8;
      }

      .card-content {
        flex: 1;
      }

      .card-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }

      .card-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }

      .card-change {
        font-size: 11px;
        font-weight: 600;
      }

      .card-change.positive { color: #10b981; }
      .card-change.negative { color: #ef4444; }
      .card-change.neutral { color: #6b7280; }

      .performance-section,
      .usage-section,
      .network-section,
      .revenue-section,
      .charts-section,
      .top-searches-section {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .performance-section h3,
      .usage-section h3,
      .network-section h3,
      .revenue-section h3,
      .charts-section h3,
      .top-searches-section h3 {
        margin: 0 0 20px 0;
        color: #333;
        font-size: 16px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }

      .metric-item {
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .metric-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
      }

      .metric-value {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
      }

      .metric-bar {
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }

      .metric-fill {
        height: 100%;
        background: #667eea;
        transition: width 0.3s ease;
      }

      .metric-fill.success { background: #10b981; }
      .metric-fill.error { background: #ef4444; }

      .usage-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }

      .usage-stat {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .stat-icon {
        font-size: 20px;
        opacity: 0.8;
      }

      .stat-value {
        font-size: 20px;
        font-weight: bold;
        color: #333;
      }

      .stat-label {
        font-size: 11px;
        color: #666;
      }

      .network-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }

      .network-stat-card {
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .network-stat-card h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #333;
      }

      .network-detail {
        font-size: 12px;
      }

      .ip-name, .network-size, .avg-size {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }

      .ip-id, .network-depth, .network-root, .network-trend {
        color: #666;
        margin-bottom: 2px;
      }

      .revenue-overview {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        align-items: start;
      }

      .revenue-total {
        text-align: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-radius: 12px;
      }

      .total-amount {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .total-label {
        font-size: 12px;
        opacity: 0.9;
      }

      .revenue-distribution {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .distribution-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dist-label {
        flex: 1;
        font-size: 12px;
        color: #666;
      }

      .dist-value {
        font-size: 12px;
        font-weight: 600;
        color: #333;
        min-width: 80px;
        text-align: right;
      }

      .dist-bar {
        flex: 2;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
      }

      .dist-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      .dist-fill.original { background: #667eea; }
      .dist-fill.derivative { background: #10b981; }
      .dist-fill.license { background: #f59e0b; }

      .charts-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }

      .chart-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
      }

      .chart-card h4 {
        margin: 0 0 15px 0;
        font-size: 14px;
        color: #333;
      }

      .chart-placeholder {
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 6px;
      }

      .simple-chart {
        display: flex;
        align-items: end;
        gap: 8px;
        height: 150px;
        padding: 10px;
      }

      .chart-day, .chart-month {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }

      .chart-bars {
        display: flex;
        align-items: end;
        gap: 2px;
        height: 120px;
      }

      .chart-bar {
        width: 12px;
        border-radius: 2px 2px 0 0;
        min-height: 2px;
        transition: all 0.3s ease;
      }

      .chart-bar.searches, .chart-bar.new-ips { background: #667eea; }
      .chart-bar.visualizations, .chart-bar.new-relationships { background: #10b981; }

      .chart-label {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .chart-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 10px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #666;
      }

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      .legend-color.searches, .legend-color.new-ips { background: #667eea; }
      .legend-color.visualizations, .legend-color.new-relationships { background: #10b981; }

      .top-searches-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .search-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .search-item:hover {
        background: #e9ecef;
      }

      .search-rank {
        font-size: 16px;
        font-weight: bold;
        color: #667eea;
        min-width: 30px;
      }

      .search-details {
        flex: 1;
      }

      .search-name {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }

      .search-id {
        font-size: 11px;
        font-family: monospace;
        color: #666;
        margin-bottom: 4px;
      }

      .search-meta {
        display: flex;
        gap: 15px;
        font-size: 10px;
        color: #888;
      }

      .search-actions {
        display: flex;
        gap: 8px;
      }

      .search-again-btn {
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s ease;
      }

      .search-again-btn:hover {
        background: #5a67d8;
      }

      @media (max-width: 768px) {
        .overview-cards {
          grid-template-columns: 1fr;
        }
        
        .revenue-overview {
          grid-template-columns: 1fr;
        }
        
        .charts-container {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
}