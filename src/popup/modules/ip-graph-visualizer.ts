import * as d3 from 'd3';

interface IPNode {
  id: string;
  name: string;
  type: 'root' | 'parent' | 'child' | 'derivative';
  owner: string;
  revenue?: number;
  derivatives?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface IPLink {
  source: string | IPNode;
  target: string | IPNode;
  type: 'parent' | 'derivative' | 'license';
  strength?: number;
}

export class IPGraphVisualizer {
  private container: HTMLElement;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private simulation!: d3.Simulation<IPNode, IPLink>;
  private nodes: IPNode[] = [];
  private links: IPLink[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.width = container.clientWidth || 360;
    this.height = container.clientHeight || 280;
    
    this.initializeSVG();
    this.initializeSimulation();
  }

  private initializeSVG(): void {
    // Clear existing content
    d3.select(this.container).selectAll('*').remove();
    
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#fafafa')
      .style('border-radius', '8px');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.svg.select('g').attr('transform', event.transform);
      });

    this.svg.call(zoom);

    // Add main group for zooming/panning
    this.svg.append('g').attr('class', 'main-group');
  }

  private initializeSimulation(): void {
    this.simulation = d3.forceSimulation<IPNode>()
      .force('link', d3.forceLink<IPNode, IPLink>().id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(30));
  }

  async loadIPRelationships(ipId: string, ipData: any, relationships: any[]): Promise<void> {
    try {
      this.buildGraphData(ipId, ipData, relationships);
      this.renderGraph();
    } catch (error) {
      console.error('Failed to load IP relationships:', error);
      this.showError('Failed to load IP relationships');
    }
  }

  private buildGraphData(rootIpId: string, rootData: any, relationships: any[]): void {
    this.nodes = [];
    this.links = [];

    // Add root node
    this.nodes.push({
      id: rootIpId,
      name: rootData.name || 'Root IP',
      type: 'root',
      owner: rootData.owner || 'Unknown',
      revenue: rootData.revenue || 0,
      derivatives: relationships.filter(r => r.type === 'derivative').length
    });

    // Add related nodes
    relationships.forEach(rel => {
      const nodeId = rel.target || rel.source;
      if (nodeId && nodeId !== rootIpId) {
        if (!this.nodes.find(n => n.id === nodeId)) {
          this.nodes.push({
            id: nodeId,
            name: rel.name || `IP ${nodeId.slice(0, 8)}...`,
            type: rel.type === 'derivative' ? 'child' : 'parent',
            owner: rel.owner || 'Unknown',
            revenue: rel.revenue || 0,
            derivatives: rel.derivatives || 0
          });
        }

        this.links.push({
          source: rel.type === 'derivative' ? rootIpId : nodeId,
          target: rel.type === 'derivative' ? nodeId : rootIpId,
          type: rel.type,
          strength: 1
        });
      }
    });

    if (this.nodes.length === 1) {
      this.addMockNodes(rootIpId);
    }
  }

  private addMockNodes(rootIpId: string): void {
    const parentId = '0x' + Math.random().toString(16).substr(2, 40);
    this.nodes.push({
      id: parentId,
      name: 'Parent IP',
      type: 'parent',
      owner: '0x1234...5678',
      revenue: 150,
      derivatives: 3
    });

    this.links.push({
      source: parentId,
      target: rootIpId,
      type: 'parent',
      strength: 1
    });

    for (let i = 0; i < 2; i++) {
      const derivativeId = '0x' + Math.random().toString(16).substr(2, 40);
      this.nodes.push({
        id: derivativeId,
        name: `Derivative ${i + 1}`,
        type: 'child',
        owner: `0xabcd...${i}${i}${i}${i}`,
        revenue: Math.random() * 50,
        derivatives: Math.floor(Math.random() * 3)
      });

      this.links.push({
        source: rootIpId,
        target: derivativeId,
        type: 'derivative',
        strength: 1
      });
    }
  }

  private renderGraph(): void {
    const mainGroup = this.svg.select('.main-group');
    mainGroup.selectAll('*').remove();

    const link = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter().append('line')
      .attr('stroke', d => this.getLinkColor(d.type))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    const node = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, IPNode>()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    node.append('circle')
      .attr('r', d => this.getNodeRadius(d.type))
      .attr('fill', d => this.getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
      .attr('x', 0)
      .attr('y', d => this.getNodeRadius(d.type) + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333');

    node.filter(d => d.revenue && d.revenue > 0)
      .append('text')
      .text(d => `$${d.revenue?.toFixed(1)}`)
      .attr('x', 0)
      .attr('y', d => this.getNodeRadius(d.type) + 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#666');

    node.append('title')
      .text(d => `${d.name}\nOwner: ${d.owner}\nType: ${d.type}\nRevenue: $${d.revenue || 0}\nDerivatives: ${d.derivatives || 0}`);

    this.simulation.nodes(this.nodes);
    (this.simulation.force('link') as d3.ForceLink<IPNode, IPLink>).links(this.links);

    this.simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as IPNode).x!)
        .attr('y1', d => (d.source as IPNode).y!)
        .attr('x2', d => (d.target as IPNode).x!)
        .attr('y2', d => (d.target as IPNode).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.simulation.alpha(1).restart();
  }

  private getNodeColor(type: string): string {
    const colors = {
      root: '#667eea',
      parent: '#10b981',
      child: '#f59e0b',
      derivative: '#ef4444'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  private getNodeRadius(type: string): number {
    const sizes = {
      root: 20,
      parent: 16,
      child: 14,
      derivative: 12
    };
    return sizes[type as keyof typeof sizes] || 12;
  }

  private getLinkColor(type: string): string {
    const colors = {
      parent: '#10b981',
      derivative: '#ef4444',
      license: '#3b82f6'
    };
    return colors[type as keyof typeof colors] || '#6b7280';
  }

  private dragStarted(event: d3.D3DragEvent<SVGGElement, IPNode, IPNode>, d: IPNode): void {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: d3.D3DragEvent<SVGGElement, IPNode, IPNode>, d: IPNode): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragEnded(event: d3.D3DragEvent<SVGGElement, IPNode, IPNode>, d: IPNode): void {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  private showError(message: string): void {
    const mainGroup = this.svg.select('.main-group');
    mainGroup.selectAll('*').remove();
    
    mainGroup.append('text')
      .text(message)
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#ef4444');
  }

  public clear(): void {
    this.nodes = [];
    this.links = [];
    this.svg.select('.main-group').selectAll('*').remove();
    
    this.svg.select('.main-group')
      .append('text')
      .text('🎯 Search for an IP Asset to visualize')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#6b7280');
  }

  public resize(): void {
    this.width = this.container.clientWidth || 360;
    this.height = this.container.clientHeight || 280;
    
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);
    
    this.simulation
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .alpha(1)
      .restart();
  }
}