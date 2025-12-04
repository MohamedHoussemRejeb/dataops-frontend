import { Component, OnDestroy } from '@angular/core';
import { NgIf, NgForOf, DatePipe, AsyncPipe, NgClass, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval, Subscription, switchMap } from 'rxjs';
import { LiveApiService, LiveRun, LiveLog } from '../../../core/api/live-api.service';

@Component({
  selector: 'app-live-runs',
  standalone: true,
  imports: [NgIf, NgForOf, AsyncPipe, DatePipe, RouterLink, NgClass, DecimalPipe],
  templateUrl: './live-runs.component.html',
  styleUrls: ['./live-runs.component.scss']
})
export class LiveRunsComponent implements OnDestroy {

  running: LiveRun[] = [];
  expanded: Record<string, boolean> = {};
  logsMap: Record<string, LiveLog[]> = {};

  private sub?: Subscription;

  constructor(private api: LiveApiService) {
    this.sub = interval(2000)
      .pipe(switchMap(() => this.api.getRunning()))
      .subscribe(list => {
        this.running = list ?? [];

        // Recharger les logs pour les runs ouverts
        this.running
          .filter(r => this.expanded[r.id])
          .forEach(r => this.reloadLogs(r.id));
      });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // 🔥🔥🔥 Les 4 jobs Talend
  startTalendArticle() {
    this.api.startTalendArticle().subscribe(run => {
      this.expanded[run.id] = true;
      this.reloadLogs(run.id);
    });
  }

  startTalendCommande() {
    this.api.startTalendCommande().subscribe(run => {
      this.expanded[run.id] = true;
      this.reloadLogs(run.id);
    });
  }

  startTalendAnnulation() {
    this.api.startTalendAnnulation().subscribe(run => {
      this.expanded[run.id] = true;
      this.reloadLogs(run.id);
    });
  }

  startTalendMvtStock() {
    this.api.startTalendMvtStock().subscribe(run => {
      this.expanded[run.id] = true;
      this.reloadLogs(run.id);
    });
  }

  // ---- Logs & UI helpers ----
  toggleLogs(runId: string) {
    this.expanded[runId] = !this.expanded[runId];
    if (this.expanded[runId]) {
      this.reloadLogs(runId);
    }
  }

  reloadLogs(runId: string) {
    this.api.getLogs(runId).subscribe(logs => {
      this.logsMap[runId] = logs ?? [];
    });
  }

  logs(runId: string): LiveLog[] {
    return this.logsMap[runId] || [];
  }

  badge(status?: string) {
    return {
      'text-bg-warning text-dark': status === 'RUNNING',
      'text-bg-danger': status === 'FAILED',
      'text-bg-success': status === 'SUCCESS',
      'text-bg-secondary': status === 'PENDING'
    };
  }
}
