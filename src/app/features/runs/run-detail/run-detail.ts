import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, NgForOf, NgClass, DatePipe } from '@angular/common';
import { interval, Subject, takeUntil } from 'rxjs';

import { RunsService } from '../../../core/runs.service';
import { EtlRun } from '../../../core/models/etl-run';

type Tab = 'overview' | 'logs' | 'meta';
type LogLevel = 'INFO' | 'ERROR' | 'WARN';

interface RunLog {
  ts: Date;
  level: LogLevel;
  msg: string;
}

@Component({
  selector: 'app-run-detail',
  standalone: true,
  imports: [RouterLink, NgIf, NgForOf, NgClass, DatePipe],
  templateUrl: './run-detail.html',
  styleUrls: ['./run-detail.scss']
})
export class RunDetail implements OnDestroy {
  run?: EtlRun;
  tab: Tab = 'overview';
  loading = true;

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private runs: RunsService) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);

    // Auto-refresh toutes les 10s si le run est en cours
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.run?.status === 'RUNNING') {
          this.load(id, /*silent*/ true);
        }
      });
  }

  private load(id: string, silent = false) {
    if (!silent) this.loading = true;
    this.runs.get(id).subscribe(r => {
      this.run = r;
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Badge Bootstrap selon le statut
  statusBadge(status?: string) {
    switch (status) {
      case 'SUCCESS': return 'text-bg-success';
      case 'FAILED':  return 'text-bg-danger';
      case 'RUNNING': return 'text-bg-warning text-dark';
      default:        return 'text-bg-secondary';
    }
  }

  // Formatage de la durée
  duration(run?: EtlRun) {
    if (!run?.startTime || !run?.endTime) return '-';
    const ms = new Date(run.endTime).getTime() - new Date(run.startTime).getTime();
    if (ms < 0) return '-';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), sec = s % 60;
    if (m < 60) return `${m}m ${sec}s`;
    const h = Math.floor(m / 60), min = m % 60;
    return `${h}h ${min}m`;
  }

  // Logs mockés pour l’onglet "Logs"
  get logs(): RunLog[] {
    if (!this.run) return [];

    const base: RunLog[] = [
      { ts: new Date(this.run.startTime), level: 'INFO', msg: 'Run démarre' },
      { ts: new Date(this.run.startTime), level: 'INFO', msg: `Flux=${this.run.flowType}` },
    ];

    if (this.run.status === 'FAILED') {
      const end = this.run.endTime ? new Date(this.run.endTime) : new Date();
      base.push({
        ts: end,
        level: 'ERROR',
        msg: this.run.message ?? 'Erreur inconnue'
      });
    } else if (this.run.endTime) {
      base.push({
        ts: new Date(this.run.endTime),
        level: 'INFO',
        msg: 'Run terminé OK'
      });
    }

    return base;
  }

  // Bouton "Relancer"
  retry() {
    if (!this.run) return;
    this.runs.retry(this.run.id).subscribe(() => {
      // TODO: afficher un toast de succès/erreur si souhaité
    });
  }
}
