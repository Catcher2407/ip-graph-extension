// src/popup/modules/ip-graph-visualizer.ts
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
  vx?: number;
  vy?: number;
}

interface IPLink {
  source: string | IPNode;
  target: string | IPNode;
  type: 'parent' | 'derivative' | 'license';
  strength?: number;
  revenue?: number;
}

export class IPGraphVisualizer {
  private container: HTMLElement;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private simulation!: d3.Simulation<IPNode, IPLink>;
  private nodes: IPNode[] = [];
  private links: IPLink[] = [];
  private nodeElements!: d3.Selection<SVGGElement, IPNode, SVGGElement, unknown>;
  private linkElements!: d3.Selection<SVGLineElement, IPLink, SVGGElement, unknown>;

  constructor(container: HTMLElement) {
    this.container = container;
    this.width = container.clientWidth || 360;
    this.height = container.clientHeight || 280;
    
    this.initializeSVG();
    this.initializeSimulation();
    this.showPlaceholder();
  }

  private initializeSVG(): void {
    // Clear existing content
    d3.select(this.container).selectAll('*').remove();
    
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#fafafa')
      .style('border-radius', '8px')
      .style('border', '1px solid #e9ecef');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.svg.select('.main-group').attr('transform', event.transform);
      });

    this.svg.call(zoom);

    // Add main group for zooming/panning
    this.svg.append('g').attr('class', 'main-group');

    // Add definitions for gradients and patterns
    const defs = this.svg.append('defs');
    
    // Add arrow markers for links
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666');
  }

  private initializeSimulation(): void {
    this.simulation = d3.forceSimulation<IPNode>()
      .force('link', d3.forceLink<IPNode, IPLink>().id(d => d.id).distance(100).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(35))
      .force('x', d3.forceX(this.width / 2).strength(0.1))
      .force('y', d3.forceY(this.height / 2).strength(0.1));
  }

  async loadIPRelationships(ipId: string, ipData: any, relationships: any[]): Promise<void> {
    try {
      console.log('Loading IP relationships for:', ipId);
      console.log('IP Data:', ipData);
      console.log('Relationships:', relationships);
      
      // Build nodes and links from the data
      this.buildGraphData(ipId, ipData, relationships);
      
      // Render the graph
      this.renderGraph();
      
    } catch (error) {
      console.error('Failed to load IP relationships:', error);
      this.showError('Failed to load IP relationships');
    }
  }

  private buildGraphData(rootIpId: string, rootData: any, relationships: any[]): void {
    this.nodes = [];
    this.links = [];

    console.log('Building graph data for:', rootIpId);

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
      const nodeId = rel.target !== rootIpId ? rel.target : rel.source;
      if (nodeId && nodeId !== rootIpId) {
        // Check if node already exists
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

        // Add link
        this.links.push({
          source: rel.source,
          target: rel.target,
          type: rel.type,
          strength: 1,
          revenue: rel.revenue || 0
        });
      }
    });

    console.log('Built nodes:', this.nodes);
    console.log('Built links:', this.links);

    // If no relationships, add some demo nodes
    if (this.nodes.length === 1) {
      this.addDemoNodes(rootIpId);
    }
  }

  private addDemoNodes(rootIpId: string): void {
    // Add demo parent
    const parentId = '0x' + Math.random().toString(16).substr(2, 40);
    this.nodes.push({
      id: parentId,
      name: 'Parent IP Asset',
      type: 'parent',
      owner: '0x1234...5678',
      revenue: 150,
      derivatives: 3
    });

    this.links.push({
      source: parentId,
      target: rootIpId,
      type: 'parent',
      strength: 1,
      revenue: 25
    });

    // Add demo derivatives
    for (let i = 0; i < 3; i++) {
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
        strength: 1,
        revenue: Math.random() * 20
      });
    }
  }

  private renderGraph(): void {
    const mainGroup = this.svg.select('.main-group');
    
    // Clear existing elements
    mainGroup.selectAll('*').remove();

    console.log('Rendering graph with nodes:', this.nodes.length, 'links:', this.links.length);

    // Create links
    this.linkElements = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter().append('line')
      .attr('stroke', d => this.getLinkColor(d.type))
      .attr('stroke-width', d => Math.max(1, (d.revenue || 0) / 20))
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    this.nodeElements = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, IPNode>()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    // Add circles to nodes
    this.nodeElements.append('circle')
      .attr('r', d => this.getNodeRadius(d.type))
      .attr('fill', d => this.getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add labels to nodes
    this.nodeElements.append('text')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name)
      .attr('x', 0)
      .attr('y', d => this.getNodeRadius(d.type) + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#333')
      .style('pointer-events', 'none');

    // Add revenue labels for nodes with revenue
    this.nodeElements.filter(d => d.revenue && d.revenue > 0)
      .append('text')
      .text(d => `$${d.revenue?.toFixed(1)}`)
      .attr('x', 0)
      .attr('y', d => this.getNodeRadius(d.type) + 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('fill', '#10b981')
      .style('pointer-events', 'none');

    // Add click handlers
    this.nodeElements.on('click', (event, d) => {
      this.handleNodeClick(event, d);
    });

    // Add hover effects
    this.nodeElements
      .on('mouseenter', (event, d) => {
        this.handleNodeHover(event, d, true);
      })
      .on('mouseleave', (event, d) => {
        this.handleNodeHover(event, d, false);
      });

    // Add tooltips
    this.nodeElements.append('title')
      .text(d => `${d.name}\nOwner: ${d.owner.slice(0, 10)}...\nType: ${d.type}\nRevenue: $${d.revenue || 0}\nDerivatives: ${d.derivatives || 0}`);

    // Update simulation
    this.simulation.nodes(this.nodes);
    (this.simulation.force('link') as d3.ForceLink<IPNode, IPLink>).links(this.links);

    // Set up tick function
    this.simulation.on('tick', () => {
      this.linkElements
        .attr('x1', d => (d.source as IPNode).x!)
        .attr('y1', d => (d.source as IPNode).y!)
        .attr('x2', d => (d.target as IPNode).x!)
        .attr('y2', d => (d.target as IPNode).y!);

      this.nodeElements
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Restart simulation
    this.simulation.alpha(1).restart();
  }

  private handleNodeClick(event: MouseEvent, d: IPNode): void {
    console.log('Node clicked:', d);
    
    // Highlight connected nodes
    this.highlightConnectedNodes(d.id);
    
    // Dispatch custom event for external handling
    const customEvent = new CustomEvent('nodeClick', {
      detail: { node: d, event }
    });
    this.container.dispatchEvent(customEvent);
  }

  private handleNodeHover(event: MouseEvent, d: IPNode, isEntering: boolean): void {
    const node = d3.select(event.currentTarget as SVGGElement);
    
    if (isEntering) {
      node.select('circle')
        .transition()
        .duration(200)
        .attr('r', this.getNodeRadius(d.type) * 1.2)
        .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))');
    } else {
      node.select('circle')
        .transition()
        .duration(200)
        .attr('r', this.getNodeRadius(d.type))
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
    }
  }

  private highlightConnectedNodes(nodeId: string): void {
    // Reset all nodes
    this.nodeElements.select('circle')
      .attr('stroke-width', 3)
      .attr('stroke', '#fff');

    this.linkElements
      .attr('stroke-opacity', 0.3);

    // Highlight selected node
    this.nodeElements.filter(d => d.id === nodeId)
      .select('circle')
      .attr('stroke-width', 4)
      .attr('stroke', '#ff6b6b');

    // Highlight connected nodes and links
    const connectedLinks = this.links.filter(l => 
      (l.source as IPNode).id === nodeId || (l.target as IPNode).id === nodeId
    );

    const connectedNodeIds = new Set<string>();
    connectedLinks.forEach(link => {
      connectedNodeIds.add((link.source as IPNode).id);
      connectedNodeIds.add((link.target as IPNode).id);
    });

    this.nodeElements.filter(d => connectedNodeIds.has(d.id))
      .select('circle')
      .attr('stroke-width', 4)
      .attr('stroke', '#4ecdc4');

    this.linkElements.filter(d => 
      (d.source as IPNode).id === nodeId || (d.target as IPNode).id === nodeId
    ).attr('stroke-opacity', 1);
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
      root: 22,
      parent: 18,
      child: 16,
      derivative: 14
    };
    return sizes[type as keyof typeof sizes] || 14;
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

  private showPlaceholder(): void {
    const mainGroup = this.svg.select('.main-group');
    mainGroup.selectAll('*').remove();
    
    const placeholder = mainGroup.append('g')
      .attr('class', 'placeholder')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);

    placeholder.append('circle')
      .attr('r', 30)
      .attr('fill', '#f8f9fa')
      .attr('stroke', '#dee2e6')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    placeholder.append('text')
      .text('🎯')
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('y', 8);

    placeholder.append('text')
      .text('Search for an IP Asset')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('y', 50)
      .attr('fill', '#6b7280');

    placeholder.append('text')
      .text('to visualize relationships')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('y', 65)
      .attr('fill', '#6b7280');
  }

  public clear(): void {
    this.nodes = [];
    this.links = [];
    this.simulation.nodes([]);
    (this.simulation.force('link') as d3.ForceLink<IPNode, IPLink>).links([]);
    this.showPlaceholder();
  }

  public resize(): void {
    this.width = this.container.clientWidth || 360;
    this.height = this.container.clientHeight || 280;
    
    this.svg
      .attr('width', this.width)
      .attr('height', this.height);
    
    this.simulation
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('x', d3.forceX(this.width / 2).strength(0.1))
      .force('y', d3.forceY(this.height / 2).strength(0.1))
      .alpha(1)
      .restart();
  }
}