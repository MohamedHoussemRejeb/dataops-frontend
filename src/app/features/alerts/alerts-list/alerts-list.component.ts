// src/app/features/alerts/alerts-list/alerts-list.component.ts
import { Component, effect } from '@angular/core';
import { NgIf, NgFor, DatePipe, NgClass, JsonPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink, Router } from '@angular/router';

import { AlertsApiService } from '../../../core/api/alerts-api.service';
import { EtlAlert, AlertSeverity } from '../../../core/models/alert';

// gouvernance UI
import { GovernanceFiltersComponent } from '../../../shared/ui/filters/governance-filters.component';
import { SensitivityBadgeComponent } from '../../../shared/ui/badges/sensitivity-badge.component';
import { LegalBadgesComponent } from '../../../shared/ui/badges/legal-badges.component';
import { Sensitivity, LegalTag } from '../../../core/models/governance.models';

// dataset
import { DatasetService } from '../../../core/dataset.service';
import { Dataset } from '../../../core/models/dataset';

// temps réel
import {
  RealtimeEventsService,
  RealtimeEvent
} from '../../../core/realtime-events.service';

@Component({
  selector: 'app-alerts-list',
  standalone: true,
  imports: [
    CommonModule, NgIf, NgFor, DatePipe, NgClass, JsonPipe, FormsModule,
    MatTableModule, MatCheckboxModule, MatButtonModule,
    MatChipsModule, MatSnackBarModule, RouterLink,
    GovernanceFiltersComponent, SensitivityBadgeComponent, LegalBadgesComponent
  ],
  templateUrl: './alerts-list.component.html',
  styleUrls: ['./alerts-list.component.scss']
})
export class AlertsList {
  alerts: EtlAlert[] = [];
  selected = new Set<string>();

  q = '';
  severity?: AlertSeverity;
  onlyOpen = true;

  selectedSensitivity: Sensitivity | '' = '';
  selectedLegal: LegalTag | '' = '';

  displayed = ['sel','date','sev','src','flow','msg','sensitivity','legal','run','ack'];

  loading = true;
  error: string | null = null;

  private metaById = new Map<string, { sensitivity?: Sensitivity; legal?: LegalTag[] }>();

  // 🔹 Pagination
  pageIndex = 0;   // page courante (0-based)
  pageSize = 10;   // nb d'alertes par page

  get total(): number {
    return this.filtered().length;
  }

  constructor(
    private api: AlertsApiService,
    private sb: MatSnackBar,
    private ds: DatasetService,
    private router: Router,                  // 🔗 navigation vers Calendar
    private realtime: RealtimeEventsService  // 🔥 temps réel
  ) {
    this.reload();

    // ⚡ Abonnement réactif au signal temps réel
    effect(() => {
      const ev: RealtimeEvent | null = this.realtime.lastEvent();
      if (!ev) return;
      if (!this.realtime.autoRefresh()) return;

      if (ev.type === 'RUN_FAILED' || ev.type === 'ALERT_CREATED') {
        // recharge silencieuse (sans snackbar "liste mise à jour")
        this.reload(false);
      }
    });
  }

  reload(showSnack = true) {
    this.loading = true;
    this.error = null;
    this.selected.clear();
    this.pageIndex = 0; // reset pagination à chaque reload

    // 1. charger la métadonnée gouvernance
    this.ds.getDatasets().subscribe({
      next: (list: Dataset[]) => {
        this.metaById.clear();
        for (const d of list) {
          if ((d as any).id) {
            this.metaById.set((d as any).id, {
              sensitivity: (d as any).sensitivity,
              legal: (d as any).legal
            });
          }
        }
      },
      error: () => {
        // on n'empêche pas l'affichage des alertes si la métadonnée échoue
      }
    });

    // 2. charger les alertes du backend Spring
    this.api.list().subscribe({
      next: (serverAlerts: EtlAlert[]) => {
        this.alerts = serverAlerts.map(a => {
          const meta = a.dataset ?? (a.dataset_urn ? this.metaById.get(a.dataset_urn) : undefined);
          return meta ? { ...a, dataset: meta } : a;
        });

        this.loading = false;
        if (showSnack) {
          this.sb.open('Liste d’alertes mise à jour', 'OK', { duration: 1000 });
        }
      },
      error: (err) => {
        console.error('Erreur load alerts', err);
        this.loading = false;
        this.error = 'Impossible de charger les alertes (backend).';
        this.sb.open('Échec du chargement des alertes', 'Fermer', { duration: 2500 });
      }
    });
  }

  toggle(id: string, e: any) {
    e.target.checked ? this.selected.add(id) : this.selected.delete(id);
  }

  isSel(id: string) {
    return this.selected.has(id);
  }

  clearSel() {
    this.selected.clear();
  }

  // 🔍 Filtres (texte, sévérité, état, sensibilité, légal)
  filtered(): EtlAlert[] {
    const q = this.q.trim().toLowerCase();
    return this.alerts.filter(a => {
      const okS = this.severity ? a.severity === this.severity : true;
      const okO = this.onlyOpen ? !a.acknowledged : true;
      const okQ = q
        ? (a.message?.toLowerCase().includes(q) ||
           (a.flowType || '').toLowerCase().includes(q) ||
           (a.source || '').toLowerCase().includes(q))
        : true;

      const sens = a.dataset?.sensitivity;
      const legals = a.dataset?.legal ?? [];
      const okSens = !this.selectedSensitivity || sens === this.selectedSensitivity;
      const okLegal = !this.selectedLegal || legals.includes(this.selectedLegal as LegalTag);

      return okS && okO && okQ && okSens && okLegal;
    });
  }

  // 🔹 Liste paginée affichée dans le template
  paged(): EtlAlert[] {
    const list = this.filtered();
    const start = this.pageIndex * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  // 🔹 Reset de la page quand un filtre change
  resetPage() {
    this.pageIndex = 0;
  }

  // Appelé par <app-governance-filters>
  onGovFilterChange(e: { sensitivity?: Sensitivity | ''; legal?: LegalTag | '' }) {
    this.selectedSensitivity = (e.sensitivity ?? '') as any;
    this.selectedLegal = (e.legal ?? '') as any;
    this.resetPage();
  }

  // À appeler depuis (ngModelChange) sur les filtres de base (q, severity, onlyOpen) si tu veux
  onFiltersChanged() {
    this.resetPage();
  }

  clearFilters() {
    this.q = '';
    this.severity = undefined;
    this.onlyOpen = true;
    this.selectedSensitivity = '';
    this.selectedLegal = '';
    this.resetPage();
    this.sb.open('Filtres réinitialisés', 'OK', { duration: 1200 });
  }

  ackSelected() {
    if (!this.selected.size) {
      this.sb.open('Sélectionne au moins une alerte', 'OK', { duration: 1200 });
      return;
    }
    this.api.acknowledge([...this.selected]).subscribe({
      next: () => {
        this.sb.open('Alertes acquittées', 'OK', { duration: 1200 });
        this.selected.clear();
        this.reload(false);
      },
      error: () => this.sb.open('Échec de l’acquittement', 'Fermer', { duration: 2000 })
    });
  }

  ackOne(id: string) {
    this.api.acknowledge([id]).subscribe({
      next: () => {
        this.sb.open('Alerte acquittée', 'OK', { duration: 1200 });
        this.reload(false);
      },
      error: () => this.sb.open('Échec de l’acquittement', 'Fermer', { duration: 2000 })
    });
  }

  // 🔗 Navigation Alerts → Calendar avec runId
  openRun(runId?: string | number) {
    if (!runId || this.loading) {
      return;
    }
    this.router.navigate(['/calendar'], {
      queryParams: { runId }
    });
  }

  trackById = (_: number, a: EtlAlert) => a.id;
}
