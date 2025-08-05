// src/popup/modules/revenue-tracker.ts
export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number[];
  revenueGrowth: number;
  topEarningAssets: Array<{
    id: string;
    name: string;
    revenue: number;
  }>;
  revenueBreakdown: {
    directSales: number;
    royalties: number;
    licensing: number;
  };
}

export class RevenueTracker {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  displayRevenueMetrics(metrics: RevenueMetrics): void {
    this.container.innerHTML = `
      <div class="revenue-dashboard">
        <div class="revenue-header">
          <h3>💰 Revenue Analytics</h3>
          <div class="total-revenue">
            <span class="amount">$${metrics.totalRevenue.toFixed(2)}</span>
            <span class="growth ${metrics.revenueGrowth >= 0 ? 'positive' : 'negative'}">
              ${metrics.revenueGrowth >= 0 ? '↗' : '↘'} ${Math.abs(metrics.revenueGrowth).toFixed(1)}%
            </span>
          </div>
        </div>

        <div class="revenue-breakdown">
          <div class="breakdown-item">
            <span class="label">Direct Sales</span>
            <span class="value">$${metrics.revenueBreakdown.directSales.toFixed(2)}</span>
            <div class="bar">
              <div class="fill" style="width: ${(metrics.revenueBreakdown.directSales / metrics.totalRevenue) * 100}%"></div>
            </div>
          </div>
          <div class="breakdown-item">
            <span class="label">Royalties</span>
            <span class="value">$${metrics.revenueBreakdown.royalties.toFixed(2)}</span>
            <div class="bar">
              <div class="fill royalty" style="width: ${(metrics.revenueBreakdown.royalties / metrics.totalRevenue) * 100}%"></div>
            </div>
          </div>
          <div class="breakdown-item">
            <span class="label">Licensing</span>
            <span class="value">$${metrics.revenueBreakdown.licensing.toFixed(2)}</span>
            <div class="bar">
              <div class="fill license" style="width: ${(metrics.revenueBreakdown.licensing / metrics.totalRevenue) * 100}%"></div>
            </div>
          </div>
        </div>

        <div class="monthly-chart">
          <h4>Monthly Revenue Trend</h4>
          <div class="chart-container">
            ${this.generateMonthlyChart(metrics.monthlyRevenue)}
          </div>
        </div>

        <div class="top-earners">
          <h4>Top Earning Assets</h4>
          <div class="earners-list">
            ${metrics.topEarningAssets.map((asset, index) => `
              <div class="earner-item">
                <span class="rank">#${index + 1}</span>
                <span class="name">${asset.name}</span>
                <span class="revenue">$${asset.revenue.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private generateMonthlyChart(monthlyData: number[]): string {
    const maxValue = Math.max(...monthlyData);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `
      <div class="chart-bars">
        ${monthlyData.map((value, index) => `
          <div class="chart-bar" title="${months[index]}: $${value.toFixed(2)}">
            <div class="bar-fill" style="height: ${(value / maxValue) * 100}%"></div>
            <span class="bar-label">${months[index]}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private addStyles(): void {
    if (document.getElementById('revenue-tracker-styles')) return;

    const style = document.createElement('style');
    style.id = 'revenue-tracker-styles';
    style.textContent = `
      .revenue-dashboard {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
      }

      .revenue-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .revenue-header h3 {
        margin: 0;
        color: #333;
        font-size: 16px;
      }

      .total-revenue {
        text-align: right;
      }

      .total-revenue .amount {
        display: block;
        font-size: 24px;
        font-weight: bold;
        color: #10b981;
      }

      .total-revenue .growth {
        font-size: 12px;
        font-weight: 600;
      }

      .total-revenue .growth.positive {
        color: #10b981;
      }

      .total-revenue .growth.negative {
        color: #ef4444;
      }

      .revenue-breakdown {
        margin-bottom: 20px;
      }

      .breakdown-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        gap: 10px;
      }

      .breakdown-item .label {
        flex: 1;
        font-size: 12px;
        color: #666;
      }

      .breakdown-item .value {
        font-size: 12px;
        font-weight: 600;
        color: #333;
        min-width: 60px;
        text-align: right;
      }

      .breakdown-item .bar {
        flex: 2;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }

      .breakdown-item .fill {
        height: 100%;
        background: #667eea;
        transition: width 0.3s ease;
      }

      .breakdown-item .fill.royalty {
        background: #10b981;
      }

      .breakdown-item .fill.license {
        background: #f59e0b;
      }

      .monthly-chart h4 {
        margin: 0 0 15px 0;
        font-size: 14px;
        color: #333;
      }

      .chart-container {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }

      .chart-bars {
        display: flex;
        align-items: end;
        gap: 4px;
        height: 80px;
      }

      .chart-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }

      .bar-fill {
        width: 100%;
        background: linear-gradient(to top, #667eea, #764ba2);
        border-radius: 2px 2px 0 0;
        min-height: 2px;
        transition: all 0.3s ease;
      }

      .chart-bar:hover .bar-fill {
        background: linear-gradient(to top, #5a67d8, #6b46c1);
      }

      .bar-label {
        font-size: 9px;
        color: #666;
        margin-top: 5px;
      }

      .top-earners h4 {
        margin: 0 0 15px 0;
        font-size: 14px;
        color: #333;
      }

      .earners-list {
        background: white;
        border-radius: 8px;
        overflow: hidden;
      }

      .earner-item {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        border-bottom: 1px solid #f3f4f6;
        gap: 10px;
      }

      .earner-item:last-child {
        border-bottom: none;
      }

      .earner-item .rank {
        font-size: 12px;
        font-weight: bold;
        color: #667eea;
        min-width: 25px;
      }

      .earner-item .name {
        flex: 1;
        font-size: 12px;
        color: #333;
      }

      .earner-item .revenue {
        font-size: 12px;
        font-weight: 600;
        color: #10b981;
      }
    `;
    document.head.appendChild(style);
  }
}