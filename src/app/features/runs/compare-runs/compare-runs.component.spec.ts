import { Component } from '@angular/core';
import { NgIf, NgForOf, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { RunsService } from '../../../core/runs.service';
import { EtlRun } from '../../../core/models/etl-run';

import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-compare-runs',
  standalone: true,
  imports: [NgIf, NgForOf, DatePipe, RouterLink, BaseChartDirective, FormsModule],
  templateUrl: './compare-runs.component.html',
  styleUrls: ['./compare-runs.component.scss']
})
export class CompareRunsComponent {
  all: EtlRun[] = [];
  a?: EtlRun;
  b?: EtlRun;

  // ids bindés aux <select>
  aId?: string;
  bId?: string;

  // Chart
  barsData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barsOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
  };

  loading = true;

  constructor(private runs: RunsService, private route: ActivatedRoute, private router: Router) {
    // charge les runs, puis synchronise avec l'URL
    this.runs.list().subscribe(list => {
      this.all = list.sort((x, y) => +new Date(y.startTime) - +new Date(x.startTime));
      this.loading = false;

      this.prefillFromQuery(); // initial
      this.route.queryParamMap.subscribe(() => this.prefillFromQuery()); // si URL change
    });
  }

  // ---- URL <-> sélection ----
  private readIdsFromUrl(): string[] {
    const qp = this.route.snapshot.queryParamMap;
    // supporte ?ids=1&ids=2 ou ?ids=1,2
    const repeated = qp.getAll('ids');
    if (repeated.length) return repeated.slice(0, 2);
    const single = qp.get('ids') || '';
    return single.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2);
  }

  private prefillFromQuery() {
    const [id1, id2] = this.readIdsFromUrl();
    this.aId = id1;
    this.bId = id2;
    this.a = id1 ? this.all.find(x => x.id === id1) : undefined;
    this.b = id2 ? this.all.find(x => x.id === id2) : undefined;
    this.refreshChart();
  }

  pickAId(id: string) {
    this.aId = id;
    this.a = this.all.find(x => x.id === id);
    this.syncUrl();
    this.refreshChart();
  }

  pickBId(id: string) {
    this.bId = id;
    this.b = this.all.find(x => x.id === id);
    this.syncUrl();
    this.refreshChart();
  }

  private syncUrl() {
    const ids: string[] = [];
    if (this.aId) ids.push(this.aId);
    if (this.bId) ids.push(this.bId);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: ids.length ? { ids } : { ids: null },
      queryParamsHandling: 'merge'
    });
  }

  // ---- Utils d’affichage ----
  private n(v?: number) { return v ?? 0; }

  durMs(r?: EtlRun) {
    if (!r?.startTime || !r?.endTime) return 0;
    const s = Date.parse(r.startTime), e = Date.parse(r.endTime);
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? (e - s) : 0;
    }

  msToHuman(ms?: number): string {
    if (!ms || ms <= 0) return '—';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m ${sec}s`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  delta(a?: number, b?: number) { return this.n(b) - this.n(a); }

  deltaClass(a?: number, b?: number, betterWhenLower = false) {
    const d = this.delta(a, b);
    if (d === 0) return 'text-muted';
    const positiveIsGood = !betterWhenLower;
    const good = positiveIsGood ? d > 0 : d < 0;
    return good ? 'text-success' : 'text-danger';
  }

  private refreshChart() {
    if (!this.a || !this.b) {
      this.barsData = { labels: [], datasets: [] };
      return;
    }
    const labels = ['rowsIn', 'rowsOut', 'rowsError'];
    const aVals = [this.n(this.a.rowsIn), this.n(this.a.rowsOut), this.n(this.a.rowsError)];
    const bVals = [this.n(this.b.rowsIn), this.n(this.b.rowsOut), this.n(this.b.rowsError)];

    this.barsData = {
      labels,
      datasets: [
        { label: 'Run A', data: aVals, stack: 'x' },
        { label: 'Run B', data: bVals, stack: 'x' }
      ]
    };
  }
}
