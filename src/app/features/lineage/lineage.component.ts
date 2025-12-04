// src/app/features/lineage/lineage.component.ts
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DatasetService } from '../../core/dataset.service';
import { LineageGraph, NodeMeta, EdgeMeta, Layer } from '../../core/models/lineage';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lineage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lineage.component.html',
  styleUrls: ['./lineage.component.scss'],
})
export class LineageComponent {

  // dimensions logiques du SVG
  viewBox = '0 0 900 600';
  readonly nodeW = 210;
  readonly nodeH = 64;

  // graphe fusionné
  private graph = signal<LineageGraph | null>(null);

  // état UI
  showIds     = signal(false);
  filterLayer = signal<'all' | Layer>('all');
  hover       = signal<string | null>(null);
  loading     = signal<boolean>(false);
  error       = signal<string | null>(null);

  constructor(private datasets: DatasetService) {
    this.loadMergedLineage();
  }

  /**
   * Charge le lineage pour TOUS les datasets et fusionne les graphes
   * (comme le lineage avancé, mais affiché en 3 colonnes).
   */
  private loadMergedLineage() {
    this.loading.set(true);
    this.error.set(null);

    this.datasets.getDatasets().subscribe({
      next: list => {
        if (!list.length) {
          this.graph.set({ nodes: [], edges: [] });
          this.loading.set(false);
          return;
        }

        // pour chaque dataset → un graphe
        const calls = list.map(d => this.datasets.lineage(d.id));

        forkJoin(calls).subscribe({
          next: graphs => {
            const nodeMap = new Map<string, NodeMeta>();
            const edgeMap = new Map<string, EdgeMeta>();

            const edgeKey = (e: EdgeMeta) =>
              `${e.from}::${e.to}::${e.type ?? ''}`;

            for (const g of graphs) {
              for (const n of g.nodes) {
                nodeMap.set(n.id, n); // dernier écrase, c'est OK
              }
              for (const e of g.edges) {
                const k = edgeKey(e);
                if (!edgeMap.has(k)) {
                  edgeMap.set(k, e);
                }
              }
            }

            this.graph.set({
              nodes: Array.from(nodeMap.values()),
              edges: Array.from(edgeMap.values())
            });

            this.loading.set(false);
          },
          error: err => {
            console.error('lineage fusion error', err);
            this.error.set('Impossible de charger le lineage.');
            this.loading.set(false);
          }
        });
      },
      error: err => {
        console.error('datasets error', err);
        this.error.set('Impossible de charger les datasets.');
        this.loading.set(false);
      }
    });
  }

  // ====== accès au graphe ======
  private nodes = computed<NodeMeta[]>(() => this.graph()?.nodes ?? []);
  private edges = computed<EdgeMeta[]>(() => this.graph()?.edges ?? []);

  // positions X par couche
  private xFor: Record<Layer, number> = {
    source: 150,
    staging: 450,
    dw: 750,
    mart: 1050
  };

  // positions Y (grille)
  private yMap = computed(() => {
    const y: Record<string, number> = {};
    const rows: Record<Layer, NodeMeta[]> = {
      source: [], staging: [], dw: [], mart: []
    };

    for (const n of this.nodes()) {
      rows[n.layer].push(n);
    }

    (['source', 'staging', 'dw', 'mart'] as Layer[]).forEach(layer => {
      rows[layer].forEach((n, i) => {
        y[n.id] = 80 + i * 90;
      });
    });

    return y;
  });

  // nœuds visibles
  visibleNodes = computed(() => {
    const flt = this.filterLayer();
    const all = this.nodes();
    return flt === 'all' ? all : all.filter(n => n.layer === flt);
  });

  // arêtes visibles
  visibleEdges = computed(() => {
    const ids = new Set(this.visibleNodes().map(n => n.id));
    return this.edges().filter(e => ids.has(e.from) && ids.has(e.to));
  });

  pos = (id: string) => {
    const n = this.nodes().find(x => x.id === id);
    if (!n) {
      return { x: 0, y: 0 };
    }
    return { x: this.xFor[n.layer], y: this.yMap()[id] ?? 40 };
  };

  // highlight
  isActive = (id: string) => {
    const h = this.hover();
    if (!h) return false;
    return (
      id === h ||
      this.visibleEdges().some(
        e => (e.from === h && e.to === id) || (e.to === h && e.from === id)
      )
    );
  };

  isDimmed = (e: EdgeMeta) => {
    const h = this.hover();
    if (!h) return false;
    return !(e.from === h || e.to === h);
  };
}
