// src/app/features/calendar/runs-calendar/runs-calendar.component.ts
import { Component, OnInit, effect } from '@angular/core';
import {
  NgIf,
  NgForOf,
  DatePipe,
  NgClass,
  DecimalPipe        // ✅ pour le pipe | number
} from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http'; 
import { EtlRun, RunMetadata } from '../../../core/models/etl-run';
import { RunsApiService } from '../../../core/api/runs-api.service';

// 🔥 import du service temps réel
import {
  RealtimeEventsService,
  RealtimeEvent
} from '../../../core/realtime-events.service';

type RangeKey = '7d' | '30d';

@Component({
  selector: 'app-runs-calendar',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    NgClass,
    DatePipe,
    DecimalPipe,      // ✅ nécessaire pour {{ value | number }}
    RouterLink
  ],
  templateUrl: './runs-calendar.component.html',
  styleUrls: ['./runs-calendar.component.scss']
})
export class RunsCalendarComponent implements OnInit {
  range: RangeKey = '30d';
  all: EtlRun[] = [];
  days: { day: Date; items: EtlRun[] }[] = [];

  loading = true;
  error: string | null = null;

  // ⭐ Sélection & métadonnées
  selectedRun: EtlRun | null = null;
  selectedMeta: RunMetadata | null = null;
  metaLoading = false;
  metaError: string | null = null;

  constructor(
    private api: RunsApiService,
    private route: ActivatedRoute,
    private realtime: RealtimeEventsService
  ) {
    this.load();

    // ---------------------------------------------------------
    // 🔥 Auto-refresh branché sur les événements WebSocket
    // ---------------------------------------------------------
    effect(() => {
      const ev: RealtimeEvent | null = this.realtime.lastEvent();
      if (!ev) return;
      if (!this.realtime.autoRefresh()) return;

      if (
        ev.type === 'RUN_STARTED' ||
        ev.type === 'RUN_FINISHED' ||
        ev.type === 'RUN_FAILED'
      ) {
        this.load();
      }
    });
  }

  // ----------------------------------------------------------
  // 🔥 Lecture des query params : /calendar?runId=123
  // ----------------------------------------------------------
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const runId = params['runId'];
      if (runId) {
        setTimeout(() => this.highlightRun(runId), 300);
      }
    });
  }

  // ----------------------------------------------------------
  // 🔥 Scroll + highlight du run ciblé
  // ----------------------------------------------------------
  highlightRun(runId: number | string) {
    setTimeout(() => {
      const el = document.getElementById('run-' + runId);

      if (el) {
        el.classList.add('highlight');

        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        setTimeout(() => el.classList.remove('highlight'), 3000);
      }
    }, 300);
  }

  // ----------------------------------------------------------
  // 🔍 Ouverture panneau de détails + appel backend /meta
  // ----------------------------------------------------------
openDetails(run: EtlRun) {
  this.selectedRun = run;
  this.selectedMeta = null;
  this.metaError = null;
  this.metaLoading = true;

  this.api.getMetadata(run.id).subscribe({
    next: (meta) => {
      this.selectedMeta = meta;
      this.metaLoading = false;
    },
    error: (err: HttpErrorResponse) => {
      console.error('Erreur chargement RunMetadata', err);

      // 👉 204 ou 404 = pas de metadata pour ce run → pas d’erreur affichée
      if (err.status === 204 || err.status === 404) {
        this.selectedMeta = null;
        this.metaError = null;
      } else {
        this.metaError = 'Impossible de charger les métadonnées du run.';
      }

      this.metaLoading = false;
    }
  });
}

  // ----------------------------------------------------------

  setRange(r: RangeKey) {
    if (this.range === r) return;
    this.range = r;
    this.compute();
  }

  private load() {
    this.loading = true;
    this.error = null;

    this.api.list().subscribe({
      next: (list: EtlRun[]) => {
        this.all = [...list].sort(
          (a, b) => +new Date(b.startTime) - +new Date(a.startTime)
        );
        this.loading = false;
        this.compute();
      },
      error: (err: unknown) => {
        console.error('Erreur API runs', err);
        this.loading = false;
        this.error = 'Impossible de charger les exécutions.';
        this.all = [];
        this.compute();
      }
    });
  }

  private compute() {
    const now = Date.now();
    const delta = this.range === '7d'
      ? 7 * 24 * 3600_000
      : 30 * 24 * 3600_000;

    const since = now - delta;

    const rangeRuns = this.all.filter(r => {
      const ts = +new Date(r.startTime);
      return !Number.isNaN(ts) && ts >= since;
    });

    const byDay = new Map<string, EtlRun[]>();
    for (const r of rangeRuns) {
      const d = new Date(r.startTime);
      const keyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const keyIso = keyDate.toISOString();

      if (!byDay.has(keyIso)) {
        byDay.set(keyIso, []);
      }
      byDay.get(keyIso)!.push(r);
    }

    this.days = Array.from(byDay.entries())
      .map(([iso, items]) => ({
        day: new Date(iso),
        items
      }))
      .sort((a, b) => +b.day - +a.day);
  }
}
