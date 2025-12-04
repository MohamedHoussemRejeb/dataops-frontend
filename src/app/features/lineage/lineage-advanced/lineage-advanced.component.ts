import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  signal, computed, effect, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import cytoscape, { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import panzoom from 'cytoscape-panzoom';

import { TrustBadgeComponent } from '../../../shared/trust-badge/trust-badge.component';
import { DatasetService } from '../../../core/dataset.service';

cytoscape.use(dagre);
cytoscape.use(coseBilkent);
(panzoom as any)(cytoscape);

type Layer = 'source'|'staging'|'dw'|'mart';
type Status = 'OK'|'RUNNING'|'LATE'|'FAILED'|'UNKNOWN';

interface NodeMeta {
  id: string; label: string; layer: Layer;
  domain?: string; owner?: string; lastStatus?: Status; lastEndedAt?: string;
  table?: string; columns?: string[];
}
interface EdgeMeta { from: string; to: string; type?: 'transform'|'copy'|'join'; }

@Component({
  selector: 'app-lineage-enterprise',
  standalone: true,
  imports: [CommonModule, FormsModule, TrustBadgeComponent],
  templateUrl: './lineage-advanced.component.html',
  styleUrls: ['./lineage-advanced.component.scss']

})
export class LineageEnterpriseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;
  private cy!: Core;
  private impactPlayed = false;   // 🔥 pour ne jouer l’onde qu’une fois

  private route = inject(ActivatedRoute);
  private ds = inject(DatasetService);

  // UI
  q = signal('');
  layerFilter = signal<'all'|Layer>('all');
  statusFilter = signal<'all'|Status>('all');
  showOnlyPath = signal(false);
  selectedNode = signal<cytoscape.NodeSingular | null>(null);

  layers: Layer[] = ['source','staging','dw','mart'];
  statuses: Status[] = ['OK','RUNNING','LATE','FAILED','UNKNOWN'];

  // Données
  dataset = signal<any | null>(null);
  rawNodes = signal<NodeMeta[]>([]);
  rawEdges = signal<EdgeMeta[]>([]);

  // Mapping → Cytoscape
  private elements = computed<ElementDefinition[]>(() => {
    const q = this.q().toLowerCase().trim();
    const lf = this.layerFilter(); const sf = this.statusFilter();

    const nodeDefs = this.rawNodes()
      .filter(n => lf==='all' || n.layer===lf)
      .filter(n => sf==='all' || (n.lastStatus||'UNKNOWN')===sf)
      .filter(n => !q || [n.label, n.domain, n.owner, n.table, ...(n.columns||[])]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
      .map(n => ({
        data: {
          id: n.id, label: n.label, layer: n.layer, domain:n.domain, owner:n.owner,
          lastStatus: n.lastStatus || 'UNKNOWN', table: n.table, columns: n.columns || [],
          lastEndedAt: n.lastEndedAt
        },
        classes: n.layer
      }));

    const idSet = new Set(nodeDefs.map(d => d.data.id));
    const edgeDefs = this.rawEdges()
      .filter(e => idSet.has(e.from) && idSet.has(e.to))
      .map(e => ({ data:{ id:`${e.from}->${e.to}`, source:e.from, target:e.to, type:e.type || 'transform' }}));

    return [...nodeDefs, ...edgeDefs];
  });

  ngAfterViewInit(): void {
    const urn = decodeURIComponent(this.route.snapshot.paramMap.get('urn') || '');

    if (urn) {
      this.ds.get(urn).subscribe(d => this.dataset.set(d));
      this.ds.lineage(urn, 2).subscribe((g: unknown) => {
        const { nodes, edges } = this.coerceGraph(g);
        this.applyGraph(nodes, edges);
        this.deferUpdate();
      });
    } else {
      this.dataset.set(null);
      this.ds.getDatasets().subscribe(list => {
        const ids = list.map(d => d.id);
        forkJoin(ids.map(id => this.ds.lineage(id, 2))).subscribe(graphs => {
          const nodeMap = new Map<string, NodeMeta>();
          const edgeSet = new Set<string>();

          for (const g of graphs) {
            const { nodes, edges } = this.coerceGraph(g);
            for (const n of nodes) nodeMap.set(this.mapNode(n).id, this.mapNode(n));
            for (const e of edges) {
              const ee = this.mapEdge(e);
              if (ee.from && ee.to) edgeSet.add(`${ee.from}->${ee.to}`);
            }
          }

          this.rawNodes.set([...nodeMap.values()]);
          this.rawEdges.set([...edgeSet].map(k => {
            const [from, to] = k.split('->'); return { from, to } as EdgeMeta;
          }));
          this.deferUpdate();
        });
      });
    }

    // Init cytoscape
    this.cy = cytoscape({
      container: this.host.nativeElement,
      elements: this.elements(),
      layout: { name:'breadthfirst', directed:true, circle:false, spacingFactor: 1.1 } as any,
      wheelSensitivity: 0.2,
      style: [
        { selector: 'node', style: {
            'shape':'round-rectangle','padding':'8px',
            'background-color':'#ffffff',
            'border-width':2,'border-color':'#7d8590',
            'label':'data(label)','text-wrap':'wrap','text-max-width': '160',
            'font-size':12,'text-valign':'center','color':'#1f2328'
        }},
        // Couleurs par couche (bordures)
        { selector: 'node.source',  style:{ 'border-color':'#2fb344' } },
        { selector: 'node.staging', style:{ 'border-color':'#1c7ed6' } },
        { selector: 'node.dw',      style:{ 'border-color':'#845ef7' } },
        { selector: 'node.mart',    style:{ 'border-color':'#0ca678' } },
        // Couleurs par statut SLA (fond)
        { selector: 'node[lastStatus = "OK"]',
          style:{ 'background-color':'#2fb344', 'color':'#fff' } },
        { selector: 'node[lastStatus = "RUNNING"]',
          style:{ 'background-color':'#1c7ed6', 'color':'#fff' } },
        { selector: 'node[lastStatus = "LATE"]',
          style:{ 'background-color':'#f59f00', 'color':'#fff' } },
        { selector: 'node[lastStatus = "FAILED"]',
          style:{ 'background-color':'#e03131', 'color':'#fff' } },
        { selector: 'node[lastStatus = "UNKNOWN"]',
          style:{ 'background-color':'#adb5bd', 'color':'#fff' } },

        { selector:'edge', style:{
            'width':2,'line-color':'#9aa3af','curve-style':'bezier',
            'target-arrow-shape':'triangle','target-arrow-color':'#9aa3af'
        }},
        { selector:'edge[type="copy"]', style:{ 'line-style':'dashed' } },
        { selector:'edge[type="join"]', style:{ 'width':3 } },
        { selector:'node:selected', style:{ 'border-color':'#2740c6','border-width':3 } },
        { selector:'edge:selected', style:{ 'line-color':'#2740c6','target-arrow-color':'#2740c6','width':3 } },
        { selector:'.faded',       style:{ 'opacity':0.15,'events':'no' } },
        { selector:'.highlighted', style:{ 'line-color':'#2740c6','target-arrow-color':'#2740c6','width':3 } },
        // ⭐ styles pour l’onde d’impact
        { selector:'.wave-node', style:{
            'border-color':'#e03131','border-width':4
        }},
        { selector:'.wave-edge', style:{
            'line-color':'#e03131','target-arrow-color':'#e03131','width':4
        }},
      ]
    });

    (this.cy as any).panzoom({ zoomFactor: 0.05 });

    this.cy.on('select', 'node', (ev) => {
      this.selectedNode.set(ev.target);
      if (this.showOnlyPath()) this.highlightNeighborhood(ev.target);
    });
    this.cy.on('unselect', 'node', () => {
      this.selectedNode.set(null);
      if (this.showOnlyPath()) this.cy.elements().removeClass('faded highlighted');
    });

    // Re-render auto quand filtres / données changent
    effect(() => {
      this.q(); this.layerFilter(); this.statusFilter(); this.rawNodes(); this.rawEdges();
      this.deferUpdate();
    });
  }

  /** Programme la mise à jour au frame suivant (quand le conteneur a sa taille) */
  private deferUpdate() {
    if (!this.cy) return;
    requestAnimationFrame(() => this.updateGraph());
  }

  /** Applique les éléments + layout + fit + éventuelle animation d’impact */
  private updateGraph() {
    if (!this.cy) return;
    const els = this.elements();
    this.cy.elements().remove();
    if (els.length) this.cy.add(els);
    this.layoutCose();
    this.cy.resize();
    this.fit();

    // 🔥 Jouer l’onde une seule fois si un nœud LATE/FAILED existe
    if (!this.impactPlayed) {
      const badNodes = this.cy.nodes().filter(n =>
        ['LATE','FAILED'].includes((n.data('lastStatus') as string) || '')
      );
      if (badNodes.nonempty()) {
        // si un noeud DW en erreur existe → priorité
        const targetDw = badNodes.filter(n => n.data('layer') === 'dw').first();
        const start = targetDw.nonempty() ? targetDw : badNodes.first();
        this.impactPlayed = true;
        this.playImpactWave(start as NodeSingular);
      }
    }
  }

  /** Animation "wave propagation" depuis un nœud en erreur */
  private playImpactWave(start: NodeSingular) {
    const visited = new Set<string>();
    const queue: Array<{ node: NodeSingular; depth: number }> = [{ node: start, depth: 0 }];
    let maxDepth = 0;

    while (queue.length) {
      const { node, depth } = queue.shift()!;
      const id = node.id();
      if (visited.has(id)) continue;
      visited.add(id);
      maxDepth = Math.max(maxDepth, depth);

      const delay = depth * 120;

      // nœud
      setTimeout(() => node.addClass('wave-node'), delay);

      // edges + voisins
      node.connectedEdges().forEach(edge => {
        setTimeout(() => edge.addClass('wave-edge'), delay);
        const other = edge.source().id() === id ? edge.target() : edge.source();
        queue.push({ node: other as NodeSingular, depth: depth + 1 });
      });
    }

    // cleanup après l’onde
    const total = maxDepth * 120 + 1200;
    setTimeout(() => {
      this.cy.elements('.wave-node').removeClass('wave-node');
      this.cy.elements('.wave-edge').removeClass('wave-edge');
      // remettre les bordures par défaut (sinon elles restent à 4px)
      this.cy.nodes().style({ 'border-width': 2 });
    }, total);
  }

  // Helpers
  private coerceGraph(g: unknown): { nodes: any[]; edges: any[] } {
    let nodes: any[] = []; let edges: any[] = [];
    if (g && typeof g === 'object') {
      const gg = g as any;
      if (Array.isArray(gg.nodes) && Array.isArray(gg.edges)) {
        nodes = gg.nodes; edges = gg.edges;
      } else if (Array.isArray(gg.vertices) && Array.isArray(gg.links)) {
        nodes = gg.vertices; edges = gg.links;
      }
    }
    return { nodes, edges };
  }
  private mapNode(n: any): NodeMeta {
    return {
      id: n.id,
      label: n.label ?? n.name ?? n.id,
      layer: (n.layer ?? 'dw') as Layer,
      domain: n.domain,
      owner: n.owner?.name ?? n.owner,
      lastStatus: n.lastStatus ?? n.status ?? 'UNKNOWN',
      lastEndedAt: n.lastEndedAt ?? n.endedAt,
      table: n.table,
      columns: n.columns || []
    };
  }
  private mapEdge(e: any): EdgeMeta {
    return { from: e.from ?? e.source, to: e.to ?? e.target, type: e.type };
  }
  private applyGraph(nodes: any[], edges: any[]) {
    this.rawNodes.set(nodes.map(n => this.mapNode(n)));
    this.rawEdges.set(edges.map(e => this.mapEdge(e)));
  }

  // Layouts / viewport
  fit() { if (this.cy) this.cy.fit(undefined, 40); }
  layoutBreadth(run = true) { if (!this.cy) return;
    const l = this.cy.layout({ name:'cose-bilkent', animate:false, gravity:0.25 } as any);
    run ? (l.run(), this.fit()) : l;
  }
  layoutDagre() { if (!this.cy) return; this.cy.layout({ name:'dagre', nodeSep: 40, rankSep: 80, edgeSep: 20, rankDir:'LR' } as any).run(); this.fit(); }
  layoutCose()  { if (!this.cy) return; this.cy.layout({ name:'cose-bilkent', animate:true, gravity:0.25 } as any).run(); this.fit(); }

  // Highlight
  highlightNeighborhood(node: cytoscape.NodeSingular) {
    const nb = node.closedNeighborhood();
    this.cy.elements().addClass('faded');
    nb.removeClass('faded').addClass('highlighted');
  }
  highlightUpstream() {
    const n = this.selectedNode(); if (!n) return;
    this.cy.elements().addClass('faded');
    n.predecessors().union(n).removeClass('faded').addClass('highlighted');
  }
  highlightDownstream() {
    const n = this.selectedNode(); if (!n) return;
    this.cy.elements().addClass('faded');
    n.successors().union(n).removeClass('faded').addClass('highlighted');
  }
  clearHighlights() { this.cy.elements().removeClass('faded highlighted'); }

  ngOnDestroy(): void { if (this.cy) this.cy.destroy(); }
}
