import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { QualityService } from '../../../core/quality.service';
import { SettingsService } from '../../../core/settings.service';

// ✅ import the quality tests component
import { QualityTestsComponent } from '../quality-tests/quality-tests.component';

// Types (adapte si tes modèles sont ailleurs)
export interface QualitySummary {
  error_rate: number;     // fraction 0..1
  freshness_min: number;  // minutes
  null_rate: number;      // fraction 0..1
  lastUpdated?: string;
}
export interface QualityPoint { t: string; v: number; }
export interface QualitySeries { metric: string; range: '7d'|'30d'; points: QualityPoint[]; }
export interface HeatCell { dataset: string; check: string; value: number; }
export interface Heatmap {
  datasets: string[];
  checks: string[];
  data: HeatCell[];
}

@Component({
  selector: 'app-quality-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    QualityTestsComponent,   // ✅ add it here
  ],
  templateUrl: './quality-dashboard.component.html',
  styleUrls: ['./quality-dashboard.component.scss']
})
export class QualityDashboardComponent {
  private svc = inject(QualityService);
  private settings = inject(SettingsService);
  private router = inject(Router);

  loading = signal(true);
  error = signal<string|null>(null);
  range = signal<'7d' | '30d'>('7d');

  summary = signal<QualitySummary | null>(null);
  seriesErr = signal<QualitySeries | null>(null);
  seriesFresh = signal<QualitySeries | null>(null);
  seriesNull = signal<QualitySeries | null>(null);
  heatmap = signal<Heatmap | null>(null);

  thresholds = computed(() => this.settings.thresholds());

  // ✅ NEW: selected dataset label (from heatmap)
  selectedDataset = signal<string | null>(null);

  // ✅ NEW: selected URN computed from the dataset label
  selectedUrn = computed(() => {
    const label = this.selectedDataset();
    return label ? this.buildUrnFromLabel(label) : null;
  });

  constructor() {
    this.loadAll(this.range());
  }

  onChangeRange(r: '7d' | '30d') {
    if (r === this.range()) return;
    this.range.set(r);
    this.loadAll(r);
  }

  loadAll(r: '7d' | '30d') {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      sum: this.svc.getSummary(),
      err: this.svc.getSeries('error_rate', r),
      fre: this.svc.getSeries('freshness_min', r),
      nul: this.svc.getSeries('null_rate', r),
      hm:  this.svc.getHeatmap(r),
    }).subscribe({
      next: ({ sum, err, fre, nul, hm }) => {
        this.summary.set(sum);
        this.seriesErr.set(err);
        this.seriesFresh.set(fre);
        this.seriesNull.set(nul);
        this.heatmap.set(hm);

        // ✅ NEW: if no dataset selected yet, pick the first one in the heatmap
        if (!this.selectedDataset() && hm?.datasets?.length) {
          this.selectedDataset.set(hm.datasets[0]);
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le dashboard qualité.');
        this.loading.set(false);
      }
    });
  }

  // ---- NEW: change selected dataset from UI
  onSelectDataset(label: string) {
    this.selectedDataset.set(label);
  }

  // ---- Classes selon seuils
  clsErrorRate(v: number) {
    const t = this.thresholds();
    if (v >= t.errorRateCrit) return 'crit';
    if (v >= t.errorRateWarn) return 'warn';
    return 'ok';
  }
  clsNullRate(v: number) {
    const t = this.thresholds();
    if (v >= t.nullRateCrit) return 'crit';
    if (v >= t.nullRateWarn) return 'warn';
    return 'ok';
  }
  clsFreshMin(v: number) {
    const t = this.thresholds();
    if (v >= t.freshCritMin) return 'crit';
    if (v >= t.freshWarnMin) return 'warn';
    return 'ok';
  }

  // ---- Sparkline SVG helper (simple)
  pathSpark(points: { t: string; v: number }[], width = 220, height = 46, pad = 4) {
    if (!points?.length) return '';
    const ys = points.map(p => p.v);
    const min = Math.min(...ys), max = Math.max(...ys);
    const sx = (width - pad * 2) / Math.max(1, points.length - 1);
    const sy = (height - pad * 2) / (max - min || 1);
    return points
      .map((p, i) => {
        const x = pad + i * sx;
        const y = height - pad - (p.v - min) * sy;
        return `${i ? 'L' : 'M'}${x},${y}`;
      })
      .join(' ');
  }

  // ---- Heatmap utils
  getHeatValue(hm: Heatmap, ds: string, ck: string): number {
    const v = hm.data.find(x => x.dataset === ds && x.check === ck)?.value;
    return v ?? 0;
  }
  getHeatClass(hm: Heatmap, ds: string, ck: string): string {
    const v = this.getHeatValue(hm, ds, ck);
    if (v < 0.5) return 'ok';
    if (v < 0.8) return 'warn';
    return 'crit';
  }

  buildUrnFromLabel(label: string) {
    return `urn:li:dataset:(urn:li:dataPlatform:postgres,${label},PROD)`;
  }

  openProfile(dsLabel: string, column = 'id') {
    const urn = this.buildUrnFromLabel(dsLabel);
    this.router.navigate(['/column-profile'], { queryParams: { urn, col: column } });
  }
}
