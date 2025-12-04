import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  LineageApi,
  ColumnGraph,
  ColumnSearchItem
} from '../../core/api/lineage-api.service';

@Component({
  standalone: true,
  selector: 'app-column-lineage',
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  template: `
  <h2>Column Lineage</h2>

  <mat-form-field appearance="outline" class="w-100">
    <mat-label>Rechercher un champ</mat-label>
    <input matInput [value]="q()" (input)="q.set(($any($event.target).value || '').trim())" placeholder="ex: email">
  </mat-form-field>

  <div *ngIf="results().length" class="mt-2">
    <div *ngFor="let r of results()" class="result" (click)="open(r)">
      <strong>{{ r.dataset }}.{{ r.column }}</strong>
      <small class="ms-2">({{ r.type }})</small>
      <span class="badge bg-secondary ms-2" *ngIf="r.sensitivity">{{ r.sensitivity }}</span>
    </div>
  </div>

  <!-- mini graph -->
  <svg *ngIf="graph() as g" [attr.width]="600" [attr.height]="200"
       style="border:1px solid #eee; margin-top:12px">
    <ng-container *ngFor="let n of g.nodes; let i = index">
      <g [attr.transform]="'translate(' + (i*200 + 60) + ',80)'">
        <rect x="-55" y="-20" width="110" height="40" rx="6" ry="6"
              [attr.fill]="n.type === 'job' ? '#ffe08a' : '#cfe8ff'" stroke="#999"></rect>
        <text text-anchor="middle" dominant-baseline="middle">{{ n.label }}</text>
      </g>
    </ng-container>

    <ng-container *ngFor="let e of g.edges">
      <line [attr.x1]="pos(e.from, g).x" [attr.y1]="pos(e.from, g).y"
            [attr.x2]="pos(e.to, g).x"   [attr.y2]="pos(e.to, g).y"
            stroke="#666" marker-end="url(#arrow)"></line>
    </ng-container>

    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#666"></path>
      </marker>
    </defs>
  </svg>
  `,
  styles: [`
    .result {
      cursor: pointer;
      padding: 6px 8px;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 6px;
    }
  `]
})
export class ColumnLineageComponent {
  private api = inject(LineageApi);

  q = signal<string>('email');
  results = signal<ColumnSearchItem[]>([]);
  graph = signal<ColumnGraph | null>(null);

  constructor() {
    // recharge la recherche à chaque changement de q
    effect(() => {
      const v = this.q();
      if (!v) { this.results.set([]); this.graph.set(null); return; }
      this.api.searchColumns(v).subscribe(({ items }) => this.results.set(items ?? []));
    });
  }

  open(r: ColumnSearchItem) {
    this.api.columnGraph(r.urn, r.column).subscribe(g => this.graph.set(g));
  }

  /** positionne les 3 nœuds sur une ligne (0,1,2) */
  pos(id: string, g: ColumnGraph): { x: number; y: number } {
    const i = Math.max(0, g.nodes.findIndex(n => n.id === id));
    return { x: i * 200 + 60, y: 80 };
  }
}
