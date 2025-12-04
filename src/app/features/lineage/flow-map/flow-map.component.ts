import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,                 // 👈 ajouté
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowApi, FlowGraph, FlowNode } from './flow-api.service';

// 👉 adapte ces imports à ton arborescence :
import { DatasetService } from '../../../core/dataset.service';
import { Dataset } from '../../../core/models/dataset';

@Component({
  standalone: true,
  selector: 'app-flow-map',

  imports: [CommonModule, FormsModule],
  templateUrl: './flow-map.component.html',
  styleUrls: ['./flow-map.component.scss']
})
export class FlowMapComponent implements OnChanges, OnInit {
  @Input() fromUrn: string | null = null;

  depth = 2;
  direction: 'downstream' | 'upstream' = 'downstream';

  graph: FlowGraph | null = null;
  loading = false;
  error: string | null = null;

  // 🔹 liste des datasets pour le <select>
  datasets: Dataset[] = [];

  constructor(
    private api: FlowApi,
    private datasetService: DatasetService,   // 👈 injecté
  ) {}

  // 🔹 charge la liste des datasets une fois au démarrage
ngOnInit(): void {
  this.datasetService.getDatasets().subscribe({
    next: (ds: Dataset[]) => {
      this.datasets = ds;
    },
    error: (err: unknown) => {
      console.error('[FlowMap] erreur chargement datasets', err);
    },
  });
}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fromUrn']) {
      this.reload();
    }
  }

  reload() {
    if (!this.fromUrn) {
      this.graph = null;
      this.error = null;
      return;
    }

    this.loading = true;
    this.error = null;

    this.api.flow(this.fromUrn, this.depth, this.direction).subscribe({
      next: (g) => {
        console.log('[FlowMap] graph reçu', g);
        this.graph = g;
        this.loading = false;
      },
      error: (err) => {
        console.error('[FlowMap] erreur', err);
        this.error = 'Impossible de charger le flow.';
        this.loading = false;
      },
    });
  }

  nodeY(n: FlowNode): number {
    if (!this.graph) return 0;
    const same = this.graph.nodes
      .filter((x) => x.level === n.level)
      .map((x) => x.id)
      .sort();
    return same.indexOf(n.id);
  }

  pt(id: string) {
    if (!this.graph) return { x: 0, y: 0 };
    const n = this.graph.nodes.find((x) => x.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.level * 240 + 80, y: this.nodeY(n) * 60 + 40 };
  }

  fill(t: FlowNode['type']) {
    if (t === 'job') return '#ffe08a';
    if (t === 'report') return '#d4f2d2';
    return '#cfe8ff';
  }
}
