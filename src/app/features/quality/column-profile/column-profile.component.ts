// src/app/features/quality/column-profile/column-profile.component.ts
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfilingApiService, ColumnProfile } from '../../../core/api/profiling-api.service';

@Component({
  standalone: true,
  selector: 'app-column-profile',
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  template: `
  <h2>Column Profiling</h2>

  <div class="filters">
    <mat-form-field appearance="outline" class="w-100">
      <mat-label>Dataset URN</mat-label>
      <input matInput [value]="urn()" (input)="onUrn(($any($event.target).value||'').trim())">
    </mat-form-field>
    <mat-form-field appearance="outline" class="w-100">
      <mat-label>Column</mat-label>
      <input matInput [value]="col()" (input)="onCol(($any($event.target).value||'').trim())">
    </mat-form-field>
  </div>

  <div *ngIf="loading()" class="text-muted py-2">Chargement…</div>

  <ng-container *ngIf="!loading() && profile() as p">
    <div class="row g-3">
      <div class="col-md-4">
        <div class="card p-3">
          <h5 class="mb-2">{{ p.column }} <small class="text-muted">({{ p.type }})</small></h5>
          <div *ngIf="p.min!==undefined">min: {{ p.min }}</div>
          <div *ngIf="p.max!==undefined">max: {{ p.max }}</div>
          <div>% null: {{ (p.nullRate*100) | number:'1.1-1' }}%</div>
          <div>distinct: {{ p.distinct }}</div>

          <div class="mt-3">
            <button class="btn btn-sm btn-outline-primary me-2" (click)="exportJSON()">Export JSON</button>
            <button class="btn btn-sm btn-outline-secondary" (click)="exportCSV()">Export CSV</button>
          </div>
        </div>

        <div class="card p-3 mt-3">
          <h6 class="mb-2">Top-K</h6>
          <div *ngFor="let t of p.topK">
            <code>{{ t.value }}</code> — {{ t.count }}
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card p-3">
          <h6 class="mb-2">Histogramme</h6>
          <div class="hist">
            <div class="bar"
                *ngFor="let b of p.histogram"
                [title]="b.bin + ' : ' + b.count"
                [style.height.%]="barHeight(b.count, p.histogram)">
              <span>{{ b.bin }}</span>
            </div>
          </div>
        </div>

        <div class="card p-3 mt-3" *ngIf="history().length">
          <h6 class="mb-2">Historique ({{ days() }} j)</h6>
          <svg [attr.width]="720" [attr.height]="180" style="border:1px solid #eee">
            <ng-container *ngFor="let pt of history(); let i = index">
              <circle [attr.cx]="10 + i*(700/(history().length-1||1))"
                      [attr.cy]="160 - (pt.nullRate*100*1.4)"
                      r="2"></circle>
            </ng-container>
          </svg>
          <div class="text-muted small mt-1">Courbe: %null</div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    .filters{ display:grid; grid-template-columns:1fr; gap:8px; max-width:720px; }
    .card{ border:1px solid #eee; border-radius:8px; }
    .hist{ display:flex; align-items:flex-end; gap:6px; height:160px; }
    .hist .bar{ width:28px; background:#cfe8ff; position:relative; }
    .hist .bar span{ position:absolute; bottom:-18px; left:0; right:0; font-size:10px; text-align:center; transform:rotate(-30deg); transform-origin:top left; }
  `]
})
export class ColumnProfileComponent {
  private api = inject(ProfilingApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  urn = signal<string>(decodeURIComponent(this.route.snapshot.queryParamMap.get('urn')||''));
  col = signal<string>(this.route.snapshot.queryParamMap.get('col')||'');
  days = signal<number>(Number(this.route.snapshot.queryParamMap.get('days')||30));

  loading = signal<boolean>(false);
  profile = signal<ColumnProfile|null>(null);
  history = signal<Array<{t:string; nullRate:number; distinct:number}>>([]);

  constructor(){
    effect(() => {
      const urn = this.urn(), col = this.col(), days = this.days();
      // maj URL
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { urn: urn || null, col: col || null, days },
        queryParamsHandling: 'merge', replaceUrl: true
      });

      if (!urn || !col) { this.profile.set(null); this.history.set([]); return; }

      this.loading.set(true);
      this.api.getColumnProfile(urn, col).subscribe({
        next: p => { this.profile.set(p); this.loading.set(false); },
        error: _ => { this.profile.set(null); this.loading.set(false); }
      });
      this.api.getColumnHistory(urn, col, days).subscribe(({points}) => this.history.set(points||[]));
    });
  }

  onUrn(v:string){ this.urn.set(v); }
  onCol(v:string){ this.col.set(v); }

  barHeight(c:number, hist:Array<{bin:string;count:number}>){
    const max = Math.max(...hist.map(h=>h.count||0)) || 1;
    return (c / max) * 100;
  }

  exportJSON(){
    const p = this.profile();
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${p.datasetUrn.replace(/[^a-z0-9_-]/ig,'_')}__${p.column}__profile.json`; a.click();
  }
  exportCSV(){
    const p = this.profile();
    if (!p) return;
    const rows = [
      ['datasetUrn','column','type','min','max','nullRate','distinct'].join(','),
      [p.datasetUrn,p.column,p.type,p.min??'',p.max??'',p.nullRate,p.distinct].join(',')
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${p.datasetUrn.replace(/[^a-z0-9_-]/ig,'_')}__${p.column}__profile.csv`; a.click();
  }
}
