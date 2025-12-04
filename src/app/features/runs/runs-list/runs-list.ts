import { Component, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { NgIf, NgFor, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { interval, Subject, takeUntil } from 'rxjs';

import { RunsService } from '../../../core/runs.service';
import { EtlRun, FlowType, Status } from '../../../core/models/etl-run';
import { RetryDialogComponent } from '../../runs/retry-dialog/retry-dialog.component';
import { RetryAdvancedComponent } from '../retry-advanced/retry-advanced.component';
import { RetryParams } from '../../../core/models/retry-params';

// --- Gouvernance
import { Sensitivity, LegalTag } from '../../../core/models/governance.models';
import { GovernanceFiltersComponent } from '../../../shared/ui/filters/governance-filters.component';
import { SensitivityBadgeComponent } from '../../../shared/ui/badges/sensitivity-badge.component';
import { LegalBadgesComponent } from '../../../shared/ui/badges/legal-badges.component';
import { StateBlockComponent } from '../../../shared/ui/states/state-block.component';

// --- Enrichissement runs ← catalogue
import { DatasetService } from '../../../core/dataset.service';
import { Dataset } from '../../../core/models/dataset';

@Component({
  selector: 'app-runs-list',
  standalone: true,
  imports: [
    NgIf, NgFor, NgClass, DatePipe, FormsModule, RouterLink,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatSelectModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatDialogModule,
    // 👇 composants gouvernance
    GovernanceFiltersComponent,
    SensitivityBadgeComponent,
    LegalBadgesComponent, StateBlockComponent
  ],
  templateUrl: './runs-list.html',
  styleUrls: ['./runs-list.scss']
})
export class RunsList implements AfterViewInit, OnDestroy {
  get hasData() { return this.dataSource?.data?.length > 0; }
  /** Données complètes (côté client) */
  private allRuns: EtlRun[] = [];

  /** DataSource Material (tri + pagination) */
  dataSource = new MatTableDataSource<EtlRun>([]);
  // 👇 ajoute les colonnes gouvernance si tu les as dans le HTML
  displayedColumns: string[] = ['startTime','flowType','status','rows','duration','sensitivity','legal','actions'];

  /** Filtres */
  flowType?: FlowType;
  status?: Status;
  q = '';
  flowTypes: FlowType[] = ['ARTICLES','COMMANDES','EXPEDITIONS','ANNULATIONS','MOUVEMENTS'];
  statuses: Status[] = ['PENDING','RUNNING','SUCCESS','FAILED'];

  /** Filtres Gouvernance */
  selectedSensitivity: Sensitivity | '' = '';
  selectedLegal: LegalTag | '' = '';

  /** Sélection */
  selectedIds = new Set<string>();

  /** Mini toast local (succès) + état réseau */
  toastOk = false;
  toastMsg = '';
  loading = true;
  error: string | null = null;

  /** Paginator / Sort refs */
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /** Auto-refresh */
  private destroy$ = new Subject<void>();

  /** Page à restaurer depuis l’URL */
  private pendingPageIndex: number | null = null;

  /** Cache id/urn → gouvernance */
  private metaById = new Map<string, { sensitivity?: Sensitivity; legal?: LegalTag[] }>();

  constructor(
    private runsSvc: RunsService,
    private sb: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private ds: DatasetService // 👈 injection ajoutée
  ) {
    // Sync URL → filtres
    this.route.queryParams.subscribe(params => {
      this.flowType = (params['flowType'] as FlowType) || undefined;
      this.status   = (params['status']   as Status)   || undefined;
      this.q        = params['q'] || '';

      // (optionnel) si tu veux supporter ces query params
      const sens = params['sens'] as Sensitivity | undefined;
      const legal = params['legal'] as LegalTag | undefined;
      if (sens !== undefined) this.selectedSensitivity = sens || '';
      if (legal !== undefined) this.selectedLegal = legal || '';

      const page = Number(params['page']);
      this.pendingPageIndex = Number.isFinite(page) && page >= 0 ? page : null;

      if (this.allRuns.length) this.applyFilters();
    });

    this.reload(); // premier chargement
    // Auto-refresh
    interval(15000).pipe(takeUntil(this.destroy$)).subscribe(() => this.reload(false));
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    setTimeout(() => {
      if (this.sort) {
        this.sort.active = 'startTime';
        this.sort.direction = 'desc';
        this.sort.sortChange.emit();
      }
      if (this.pendingPageIndex != null && this.paginator) {
        this.paginator.pageIndex = this.pendingPageIndex;
      }
    });

    this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe(() => this.syncQueryParams());
    this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.paginator.firstPage();
      this.syncQueryParams();
    });
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
  }

  /** Chargement avec gestion loading/error + option snackbar info */
  reload(showSnack = true) {
    this.loading = true;
    this.error = null;

    this.runsSvc.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: runs => {
        this.allRuns = runs;
        this.applyFilters(); // affiche tout de suite

        // 👇 Ensuite, récupère le catalogue pour enrichir les runs avec la gouvernance
        this.ds.getDatasets().pipe(takeUntil(this.destroy$)).subscribe({
          next: (list: Dataset[]) => {
            this.metaById.clear();
            for (const d of list) {
              const sens = (d as any).sensitivity as Sensitivity | undefined;
              const legal = (d as any).legal as LegalTag[] | undefined;
              if (d.id) this.metaById.set(d.id, { sensitivity: sens, legal });
              // si ton modèle Dataset expose aussi 'urn', on le mappe aussi :
              if ((d as any).urn) this.metaById.set((d as any).urn, { sensitivity: sens, legal });
            }

            // essaie d’enrichir chaque run avec datasetId / dataset_urn / datasetUrn / dataset.{id|urn}
            this.allRuns = this.allRuns.map(r => {
              const key =
                (r as any).datasetId ||
                (r as any).dataset_urn ||
                (r as any).datasetUrn ||
                (r as any).dataset?.id ||
                (r as any).dataset?.urn ||
                '';
              const meta = key ? this.metaById.get(key) : undefined;
              return meta ? ({ ...(r as any), dataset: meta } as EtlRun & { dataset?: any }) : r;
            });

            this.applyFilters(); // réapplique pour refléter les badges/filtres
          },
          error: () => { /* ne bloque pas l’UI */ }
        });

        this.loading = false;
        if (showSnack) this.sb.open('Liste mise à jour', 'OK', { duration: 1000 });
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger la liste des runs.';
        this.sb.open('Échec du chargement des runs', 'Fermer', { duration: 2500 });
      }
    });
  }

  applyFilters() {
    const q = this.q.trim().toLowerCase();
    const filtered = this.allRuns.filter(r => {
      const okType   = this.flowType ? r.flowType === this.flowType : true;
      const okStatus = this.status   ? r.status   === this.status   : true;
      const okQ = q ? (
        (r.message?.toLowerCase().includes(q) ?? false) ||
        (r.sourceFile?.toLowerCase().includes(q) ?? false)
      ) : true;

      // --- Filtrage Gouvernance ---
      const sens = (r as any).dataset?.sensitivity as Sensitivity | undefined;
      const legals = ((r as any).dataset?.legal as LegalTag[] | undefined) ?? [];
      const okSens = !this.selectedSensitivity || sens === this.selectedSensitivity;
      const okLegal = !this.selectedLegal || legals.includes(this.selectedLegal as LegalTag);

      return okType && okStatus && okQ && okSens && okLegal;
    });

    this.dataSource.data = filtered;

    if (this.paginator && this.paginator.pageIndex >= this.paginator.getNumberOfPages()) {
      this.paginator.firstPage();
    }
  }

  // appelé par le composant <app-governance-filters>
  onGovFilterChange(e: { sensitivity?: Sensitivity | ''; legal?: LegalTag | '' }) {
    this.selectedSensitivity = (e.sensitivity ?? '') as any;
    this.selectedLegal = (e.legal ?? '') as any;
    this.onFilterClick();
  }

  onFilterClick() {
    if (this.paginator) this.paginator.firstPage();
    this.applyFilters();
    this.syncQueryParams();
  }

  clearFilters() {
    this.flowType = undefined;
    this.status = undefined;
    this.q = '';
    // 👇 reset gouvernance
    this.selectedSensitivity = '';
    this.selectedLegal = '';

    if (this.paginator) this.paginator.firstPage();
    this.applyFilters();
    this.syncQueryParams();
    this.sb.open('Filtres réinitialisés', 'OK', { duration: 1200 });
  }

  private syncQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        flowType: this.flowType || null,
        status: this.status || null,
        q: this.q || null,
        page: this.paginator ? this.paginator.pageIndex : null,
        // (optionnel) partager les filtres gouvernance dans l’URL
        sens: this.selectedSensitivity || null,
        legal: this.selectedLegal || null
      },
      queryParamsHandling: 'merge'
    });
  }

  /** --- Sélection & comparaison --- */
  toggleSelect(id: string, checked: boolean) {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  compareSelected() {
    if (this.selectedIds.size !== 2) {
      this.sb.open('Sélectionne exactement 2 runs pour comparer', 'OK', { duration: 1600 });
      return;
    }
    const ids = Array.from(this.selectedIds);
    this.router.navigate(['/runs/compare'], { queryParams: { ids } }); // => ?ids=ID1&ids=ID2
  }

  /** --- Actions --- */
  retry(id: string) {
    this.runsSvc.retry(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showToast('Run relancé ✅');
        this.reload(false);
      },
      error: () => this.sb.open('Échec du retry', 'Fermer', { duration: 2000 })
    });
  }

  exportCsv() {
    const rows = this.dataSource.filteredData?.length ? this.dataSource.filteredData : this.dataSource.data;
    if (!rows?.length) {
      this.sb.open('Rien à exporter', 'OK', { duration: 1500 });
      return;
    }

    const header = [
      'id','flowType','status','startTime','endTime',
      'rowsIn','rowsOut','rowsError','durationMs','sourceFile','message','trigger',
      // 👇 ajoute gouvernance
      'sensitivity','legal'
    ];

    const escape = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [
      header.join(','),
      ...rows.map(r => header.map(k => {
        if (k === 'sensitivity') return escape((r as any).dataset?.sensitivity ?? '');
        if (k === 'legal') return escape(((r as any).dataset?.legal ?? []).join('|'));
        return escape((r as any)[k]);
      }).join(','))
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runs_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Export CSV prêt ✅');
  }

  gen() {
    this.runsSvc.simulateRandomRun().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showToast('Run simulé ✅');
        this.reload(false);
      },
      error: () => this.sb.open('Échec de la simulation', 'Fermer', { duration: 2000 })
    });
  }

  msToHuman(ms?: number): string {
    if (ms == null || ms <= 0 || Number.isNaN(ms)) return '—';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  /** Mini toast local (succès) */
  private showToast(msg: string) {
    this.toastMsg = msg;
    this.toastOk = true;
    setTimeout(() => (this.toastOk = false), 1800);
  }

  // --- Modales ---
  openRetry(run: EtlRun) {
    const ref = this.dialog.open(RetryDialogComponent, {
      width: '520px',
      data: { id: run.id }
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((params?: RetryParams) => {
      if (!params) return; // annulé
      this.runsSvc.retryAdvanced(run.id, params).subscribe(() => {
        this.sb.open('Retry lancé avec paramètres', 'OK', { duration: 1600 });
        this.reload(false);
      });
    });
  }

  openRetryAdvanced(id: string) {
    const ref = this.dialog.open(RetryAdvancedComponent, {
      width: '640px',
      data: { id }
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((params: RetryParams | undefined) => {
      if (!params) return;
      this.runsSvc.retryAdvanced(id, params).subscribe(() => {
        this.sb.open('Relance avancée soumise', 'OK', { duration: 1500 });
        this.reload(false);
      });
    });
  }
}
