import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { DatasetService } from '../../../core/dataset.service';
import { Dataset, Risk } from '../../../core/models/dataset';

// ⭐️ favoris
import { SubscriptionsService } from '../../../core/subscriptions.service';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';

// ⭐️ Trust & Risk
import { TrustBadgeComponent } from '../../../shared/trust-badge/trust-badge.component';
import { RiskPillComponent } from '../../../shared/risk-pill/risk-pill.component';

// ⭐️ Toasts
import { ToastService } from '../../../core/toast.service';

// ⭐️ Gouvernance
import { Sensitivity, LegalTag } from '../../../core/models/governance.models';
import { GovernanceFiltersComponent } from '../../../shared/ui/filters/governance-filters.component';
import { SensitivityBadgeComponent } from '../../../shared/ui/badges/sensitivity-badge.component';
import { LegalBadgesComponent } from '../../../shared/ui/badges/legal-badges.component';
import { StateBlockComponent } from '../../../shared/ui/states/state-block.component';

// ⭐️ Temps réel
import { RealtimeEventsService, RealtimeEvent } from '../../../core/realtime-events.service';

// ⭐️ Audit
import { AuditService } from '../../../core/audit.service';
import { AuditEvent, AuditKind } from '../../../core/models/audit-event';

// ⭐️ Auth
import { AuthService } from '../../../core/auth.service';

type SortKey = 'name' | 'domain' | 'status' | 'endedAt' | 'owner';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FavoriteButtonComponent,
    TrustBadgeComponent,
    RiskPillComponent,
    GovernanceFiltersComponent,
    SensitivityBadgeComponent,
    LegalBadgesComponent,
    StateBlockComponent
  ],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent {
  private ds = inject(DatasetService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly subs = inject(SubscriptionsService);
  private toast = inject(ToastService);
  private realtime = inject(RealtimeEventsService);
  private audit = inject(AuditService); // 🔥 Audit
  private auth = inject(AuthService);   // 🔥 Auth pour récupérer le user

  // state
  loading = signal(true);
  error = signal<string | null>(null);
  datasets = signal<Dataset[]>([]);

  q = signal('');
  sortBy = signal<SortKey>('name');
  perPage = signal(12);
  page = signal(1);
  tableView = signal(false);
  groupByDomain = signal(false);
  onlyFav = signal(false);

  // Gouvernance
  selectedSensitivity = signal<Sensitivity | ''>('');
  selectedLegal = signal<LegalTag | ''>('');

  // facets
  domainSet = signal<Set<string>>(new Set());
  statusSet = signal<Set<string>>(new Set());
  tagSet = signal<Set<string>>(new Set());
  ownerSet = signal<Set<string>>(new Set());

  statuses: any = ['OK', 'LATE', 'FAILED', 'RUNNING', 'UNKNOWN'];

  skeletonItems = Array.from({ length: 6 });

  // 🔥 dataset à auto-focus quand ouvert avec ?dataset=...
  private pendingDatasetUrn: string | null = null;

  // 🔥 État du modal de création / édition
  showDatasetModal = signal(false);
  isEditMode = signal(false);
  saving = signal(false);
  editingDataset: Dataset | null = null;

  formError = '';

  // 🔥 modèle du formulaire du modal
  modalModel: {
    id: string | null;
    name: string;
    urn: string;
    description: string;
    domain: string;
    tags: string;
    dependencies: string;
    slaFrequency: 'hourly' | 'daily' | 'weekly';
    slaExpectedBy: string;
    slaMaxDelayMin: number;
    sensitivity: Sensitivity | '';
    legal: LegalTag[];
    trust: number | null;
    risk: Risk;
    ownerName: string;
    ownerEmail: string;
  } = this.emptyModalModel();

  private emptyModalModel() {
    return {
      id: null,
      name: '',
      urn: '',
      description: '',
      domain: '',
      tags: '',
      dependencies: '',
      slaFrequency: 'daily' as 'hourly' | 'daily' | 'weekly',
      slaExpectedBy: '06:00',
      slaMaxDelayMin: 30,
      sensitivity: '' as Sensitivity | '',
      legal: [] as LegalTag[],
      trust: null as number | null,
      risk: 'UNKNOWN' as Risk,
      ownerName: '',
      ownerEmail: ''
    };
  }

  // derived lists
  domains = computed(() =>
    [...new Set(this.datasets().map(d => d.domain).filter(Boolean) as string[])].sort()
  );

  tags = computed(() =>
    [...new Set(this.datasets().flatMap(d => d.tags || []))].sort()
  );

  owners = computed(() =>
    [...new Set(this.datasets().map(d => d.owner?.name).filter(Boolean) as string[])].sort()
  );

  filtered = computed(() => {
    const query = this.q().toLowerCase().trim();

    let ds = this.datasets().filter(d => {
      if (this.onlyFav() && !this.subs.is(d.id)) return false;

      if (query) {
        const hay = [
          d.name,
          d.description,
          d.domain,
          d.owner?.name,
          d.owner?.email,
          ...(d.dependencies || []),
          ...(d.tags || [])
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!hay.includes(query)) return false;
      }

      if (this.domainSet().size && !this.domainSet().has(d.domain || '')) return false;
      if (this.ownerSet().size && !this.ownerSet().has(d.owner?.name || '')) return false;
      if (this.statusSet().size && !this.statusSet().has(d.lastLoad?.status || 'UNKNOWN')) return false;

      if (this.tagSet().size) {
        const set = new Set(d.tags || []);
        let ok = false;
        for (const t of this.tagSet()) {
          if (set.has(t)) {
            ok = true;
            break;
          }
        }
        if (!ok) return false;
      }

      // Gouvernance
      if (this.selectedSensitivity() && d.sensitivity !== this.selectedSensitivity()) return false;

      if (this.selectedLegal()) {
        const legals = d.legal || [];
        if (!legals.includes(this.selectedLegal() as LegalTag)) return false;
      }

      return true;
    });

    ds.sort(this.subs.boostFirst<Dataset>());

    const key = this.sortBy();
    ds.sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name);
      if (key === 'domain') return (a.domain || '').localeCompare(b.domain || '');
      if (key === 'owner') return (a.owner?.name || '').localeCompare(b.owner?.name || '');
      if (key === 'status') return this.rank(a.lastLoad?.status) - this.rank(b.lastLoad?.status);
      if (key === 'endedAt') {
        return (
          new Date(b.lastLoad?.endedAt || 0).getTime() -
          new Date(a.lastLoad?.endedAt || 0).getTime()
        );
      }
      return 0;
    });

    return ds;
  });

  countByStatus = computed(() => {
    const acc: any = {
      OK: 0,
      LATE: 0,
      FAILED: 0,
      RUNNING: 0,
      UNKNOWN: 0
    };

    for (const d of this.filtered()) {
      const s = (d.lastLoad?.status || 'UNKNOWN') as keyof typeof acc;
      acc[s] = (acc[s] ?? 0) + 1;
    }

    return acc as Record<'OK' | 'LATE' | 'RUNNING' | 'FAILED' | 'UNKNOWN', number>;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.perPage()))
  );

  paged = computed(() => {
    const p = Math.min(this.page(), this.totalPages());
    const start = (p - 1) * this.perPage();
    return this.filtered().slice(start, start + this.perPage());
  });

  groupedByDomain = computed(() => {
    const map = new Map<string, Dataset[]>();
    for (const d of this.filtered()) {
      const k = d.domain || '—';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(d);
    }
    return [...map.entries()].map(([key, items]) => ({ key, items }));
  });

  constructor() {
    this.reload();

    // 🔥 écouter ?dataset=... dans l’URL (depuis Access Matrix)
    this.route.queryParams.subscribe(params => {
      const urn = params['dataset'];
      if (urn) {
        this.pendingDatasetUrn = urn;
        if (!this.loading() && this.filtered().length) {
          this.autoOpenDataset(urn);
        }
      }
    });

    // 🔥 updates temps réel DATASET_UPDATED
    effect(() => {
      const ev: RealtimeEvent | null = this.realtime.lastEvent();
      if (!ev || !this.realtime.autoRefresh()) {
        return;
      }

      if (ev.type === 'DATASET_UPDATED') {
        const payload: any = ev.payload || {};
        const urn = payload.urn as string | undefined;
        if (!urn) return;

        this.datasets.update(list =>
          list.map(d => {
            if (d.urn !== urn) return d;

            const prevLoad = (d.lastLoad || {}) as {
              status?: string;
              endedAt?: string;
              durationSec?: number;
            };

            const prevSla = (d.sla || {}) as {
              frequency?: string;
              expectedBy?: string;
              maxDelayMin?: number;
            };

            const eSla = (payload.sla || {}) as {
              frequency?: string;
              expectedBy?: string;
              maxDelayMin?: number;
            };

            return {
              ...d,
              lastLoad: {
                ...prevLoad,
                status: payload.status ?? prevLoad.status ?? 'OK',
                endedAt:
                  payload.endedAt ?? prevLoad.endedAt ?? new Date().toISOString(),
                durationSec: payload.durationSec ?? prevLoad.durationSec
              },
              sla: payload.sla
                ? {
                    ...prevSla,
                    frequency: eSla.frequency ?? prevSla.frequency,
                    expectedBy: eSla.expectedBy ?? prevSla.expectedBy,
                    maxDelayMin: eSla.maxDelayMin ?? prevSla.maxDelayMin
                  }
                : d.sla
            } as Dataset;
          })
        );
      }
    });

    // reset page quand filtres / recherche changent
    effect(() => {
      this.q();
      this.sortBy();
      this.domainSet();
      this.statusSet();
      this.tagSet();
      this.ownerSet();
      this.onlyFav();
      this.selectedSensitivity();
      this.selectedLegal();
      this.page.set(1);
    });
  }

  // 🔥 helper: user courant pour l’audit (branché sur AuthService)
  private getCurrentAuditUser(): AuditEvent['user'] {
    const u = this.auth.currentUser;
    if (!u) {
      return { name: 'anonymous', email: '' };
    }
    return { name: u.name, email: u.email || '' };
  }

  // 🔥 helper générique pour logger un évènement côté timeline
  private logCatalogEvent(meta: Record<string, any>, kind: AuditKind = 'comment') {
    this.audit.log(
      kind,
      this.getCurrentAuditUser(),
      {
        feature: 'catalog',
        ...meta
      }
    );
  }

  reload() {
    this.loading.set(true);
    this.error.set(null);

    this.ds.getDatasets().subscribe({
      next: (list) => {
        this.datasets.set(list);
        this.loading.set(false);
        this.restoreFromUrl();

        if (this.pendingDatasetUrn) {
          this.autoOpenDataset(this.pendingDatasetUrn);
        }

        this.logCatalogEvent({
          action: 'CATALOG_RELOAD_SUCCESS',
          comment: `Catalogue chargé (${list.length} datasets)`,
          count: list.length
        });
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.error.set('Impossible de charger le catalogue.');
        this.toast.error('Échec du chargement du catalogue');

        this.logCatalogEvent(
          {
            action: 'CATALOG_RELOAD_ERROR',
            comment: 'Erreur lors du chargement du catalogue',
            error: String(err)
          },
          'error'
        );
      }
    });
  }

  onGovFilterChange(e: { sensitivity?: Sensitivity | ''; legal?: LegalTag | '' }) {
    this.selectedSensitivity.set((e.sensitivity ?? '') as any);
    this.selectedLegal.set((e.legal ?? '') as any);
    this.page.set(1);

    const u = new URL(location.href);

    if (this.selectedSensitivity()) {
      u.searchParams.set('sens', this.selectedSensitivity() as string);
    } else {
      u.searchParams.delete('sens');
    }

    if (this.selectedLegal()) {
      u.searchParams.set('legal', this.selectedLegal() as string);
    } else {
      u.searchParams.delete('legal');
    }

    history.replaceState({}, '', `${u.pathname}?${u.searchParams.toString()}`);

    this.logCatalogEvent({
      action: 'CATALOG_GOV_FILTER_CHANGE',
      comment: 'Changement des filtres de gouvernance',
      sensitivity: this.selectedSensitivity() || null,
      legal: this.selectedLegal() || null
    });
  }

  /* ------------------------------------------------------------------------
   *  MODAL CRUD : créer / modifier un dataset
   * --------------------------------------------------------------------- */

  private resetForm() {
    this.modalModel = this.emptyModalModel();
    this.formError = '';
    this.editingDataset = null;
    this.saving.set(false);
  }

  // alias si ton HTML utilise encore openCreateDialog()
  openCreateDialog() {
    this.openCreateModal();
  }

  openCreateModal() {
    this.resetForm();
    this.isEditMode.set(false);

    const user = this.getCurrentAuditUser();
    this.modalModel.ownerName = user.name || 'non défini';
    this.modalModel.ownerEmail = user.email || '';

    this.showDatasetModal.set(true);
  }

  // alias si ton HTML utilise encore openEditDialog(d)
  openEditDialog(d: Dataset) {
    this.openEditModal(d);
  }

  openEditModal(d: Dataset) {
    this.resetForm();
    this.isEditMode.set(true);
    this.editingDataset = d;

    this.modalModel = {
      id: d.id,
      name: d.name || '',
      urn: d.urn || '',
      description: d.description || '',
      domain: d.domain || '',
      tags: (d.tags || []).join(', '),
      dependencies: (d.dependencies || []).join(', '),
      slaFrequency: d.sla?.frequency || 'daily',
      slaExpectedBy: d.sla?.expectedBy || '06:00',
      slaMaxDelayMin: d.sla?.maxDelayMin ?? 30,
      sensitivity: d.sensitivity || '',
      legal: d.legal || [],
      trust: d.trust ?? null,
      risk: d.risk || 'UNKNOWN',
      ownerName: d.owner?.name || '',
      ownerEmail: d.owner?.email || ''
    };

    this.showDatasetModal.set(true);
  }

  onUrnFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];

    // pour l’instant : on utilise juste le nom du fichier comme URN
    this.modalModel.urn = file.name;
  }

  closeDatasetModal() {
    if (this.saving()) return; // empêcher fermeture pendant un save éventuel
    this.showDatasetModal.set(false);
    this.resetForm();
  }

  saveDataset(event?: Event) {
    event?.preventDefault();
    if (this.saving()) return;

    const m = this.modalModel;
    const name = (m.name || '').trim();

    if (!name) {
      this.formError = 'Le nom du dataset est obligatoire.';
      return;
    }

    this.formError = '';
    this.saving.set(true);

    const tags = (m.tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(t => !!t);

    const deps = (m.dependencies || '')
      .split(',')
      .map(t => t.trim())
      .filter(t => !!t);

    const base: Partial<Dataset> & { name: string } = {
      name,
      urn: m.urn?.trim() || undefined,
      description: m.description?.trim() || undefined,
      domain: m.domain?.trim() || undefined,
      tags,
      dependencies: deps,
      sla: {
        frequency: m.slaFrequency,
        expectedBy: m.slaExpectedBy,
        maxDelayMin: Number(m.slaMaxDelayMin) || 0
      },
      sensitivity: m.sensitivity || undefined,
      legal: m.legal && m.legal.length ? m.legal : undefined,
      trust: m.trust != null ? Number(m.trust) : undefined,
      risk: m.risk || 'UNKNOWN'
    };

    if (this.isEditMode() && this.editingDataset) {
      const d = this.editingDataset;
      const patch: Partial<Dataset> = { ...base };

      this.ds.updateDataset(d.id, patch).subscribe({
        next: (updated) => {
          this.toast.success('Dataset mis à jour');

          this.logCatalogEvent({
            action: 'DATASET_UPDATE',
            comment: `Mise à jour dataset "${updated.name}"`,
            datasetId: updated.id,
            datasetUrn: updated.urn,
            datasetName: updated.name,
            changes: patch
          });

          this.saving.set(false);
          this.closeDatasetModal();
          this.reload();
        },
        error: (err) => {
          console.error(err);
          this.saving.set(false);
          this.toast.error('Erreur lors de la mise à jour du dataset');

          this.logCatalogEvent(
            {
              action: 'DATASET_UPDATE_ERROR',
              comment: `Erreur lors de la mise à jour du dataset "${d.name}"`,
              datasetId: d.id,
              datasetUrn: d.urn,
              error: String(err)
            },
            'error'
          );
        }
      });

    } else {
      const user = this.getCurrentAuditUser();

      const payload: Partial<Dataset> & { name: string } = {
        ...base,
        owner: {
          name: user.name || 'non défini',
          email: user.email || ''
        }
      };

      this.ds.createDataset(payload).subscribe({
        next: (created) => {
          this.toast.success('Dataset créé avec succès');

          this.logCatalogEvent({
            action: 'DATASET_CREATE',
            comment: `Création dataset "${created.name}"`,
            datasetId: created.id,
            datasetUrn: created.urn,
            datasetName: created.name
          });

          this.saving.set(false);
          this.closeDatasetModal();
          this.reload();
        },
        error: (err) => {
          console.error(err);
          this.saving.set(false);
              if (err.status === 409) {
      this.toast.error('Un dataset avec ce fichier / URN existe déjà.');
    } else {
      this.toast.error('Erreur lors de la création du dataset');
    }

          this.logCatalogEvent(
            {
              action: 'DATASET_CREATE_ERROR',
              comment: `Erreur lors de la création du dataset "${name}"`,
              error: String(err),
              datasetName: name
            },
            'error'
          );
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
   *  DELETE / DIVERS
   * --------------------------------------------------------------------- */

  confirmDelete(d: Dataset) {
    const ok = window.confirm(
      `Supprimer le dataset "${d.name}" ? Cette action est définitive.`
    );
    if (!ok) return;

    this.ds.deleteDataset(d.id).subscribe({
      next: () => {
        this.toast.success('Dataset supprimé');

        this.logCatalogEvent({
          action: 'DATASET_DELETE',
          comment: `Suppression dataset "${d.name}"`,
          datasetId: d.id,
          datasetUrn: d.urn,
          datasetName: d.name
        });

        this.reload();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Erreur lors de la suppression du dataset');

        this.logCatalogEvent(
          {
            action: 'DATASET_DELETE_ERROR',
            comment: `Erreur lors de la suppression du dataset "${d.name}"`,
            datasetId: d.id,
            datasetUrn: d.urn,
            error: String(err)
          },
          'error'
        );
      }
    });
  }

  initials(n: string) {
    return (n || '')
      .split(' ')
      .map(x => x[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  labelFreq(f?: 'hourly' | 'daily' | 'weekly') {
    switch (f) {
      case 'hourly':
        return 'Horaire';
      case 'daily':
        return 'Quotidien';
      case 'weekly':
        return 'Hebdo';
      default:
        return '—';
    }
  }

  statusText(s?: string) {
    return s === 'OK'
      ? 'OK'
      : s === 'LATE'
      ? 'En retard'
      : s === 'FAILED'
      ? 'Échec'
      : s === 'RUNNING'
      ? 'En cours'
      : 'Inconnu';
  }

  statusClass(s?: string) {
    return s === 'OK'
      ? 'ok'
      : s === 'LATE'
      ? 'late'
      : s === 'FAILED'
      ? 'failed'
      : s === 'RUNNING'
      ? 'running'
      : 'unknown';
  }

  rank(s?: string) {
    return s === 'OK'
      ? 1
      : s === 'RUNNING'
      ? 2
      : s === 'LATE'
      ? 3
      : s === 'FAILED'
      ? 4
      : 5;
  }

  openDetail(d: Dataset) {
    if (!d?.id) return;

    this.logCatalogEvent({
      action: 'DATASET_VIEW_DETAILS',
      comment: `Consultation fiche dataset "${d.name}"`,
      datasetId: d.id,
      datasetUrn: d.urn
    });

    this.router.navigate(['/catalog', d.id]);
  }

  openLineage(d: Dataset) {
    if (!d?.urn) return;

    this.logCatalogEvent({
      action: 'DATASET_VIEW_LINEAGE',
      comment: `Ouverture lineage pour "${d.name}"`,
      datasetId: d.id,
      datasetUrn: d.urn
    });

    this.router.navigate(['/lineage'], {
      queryParams: { dataset: d.urn }
    });
  }

  openLineaged(d: { id: string }) {
    if (!d?.id) return;

    this.logCatalogEvent({
      action: 'DATASET_VIEW_LINEAGE_LEGACY',
      comment: `Ouverture lineage legacy pour dataset #${d.id}`,
      datasetId: d.id
    });

    this.router.navigate(['/lineage', d.id]);
  }

  toggleSet<T>(sig: ReturnType<typeof signal<Set<T>>>, val: T, on: boolean) {
    const next = new Set(sig());
    if (on) {
      next.add(val);
    } else {
      next.delete(val);
    }
    sig.set(next);
  }

  clearFilters() {
    this.domainSet.set(new Set());
    this.statusSet.set(new Set());
    this.tagSet.set(new Set());
    this.ownerSet.set(new Set());
    this.q.set('');
    this.selectedSensitivity.set('');
    this.selectedLegal.set('');

    this.toast.info('Filtres réinitialisés');

    const u = new URL(location.href);
    ['sens', 'legal', 'dom', 'st', 'tag', 'own', 'q'].forEach(k =>
      u.searchParams.delete(k)
    );

    history.replaceState({}, '', u.pathname);

    this.logCatalogEvent({
      action: 'CATALOG_FILTER_RESET',
      comment: 'Réinitialisation des filtres du catalogue'
    });
  }

  exportCsv() {
    const data = this.filtered();
    if (!data.length) {
      this.toast.warn('Aucune donnée à exporter');
      return;
    }

    const rows = data.map(d => ({
      id: d.id,
      name: d.name,
      domain: d.domain || '',
      owner: d.owner?.name || '',
      owner_email: d.owner?.email || '',
      status: d.lastLoad?.status || 'UNKNOWN',
      last_ended_at: d.lastLoad?.endedAt || '',
      last_duration_sec: d.lastLoad?.durationSec || '',
      sla_frequency: d.sla?.frequency || '',
      sla_expectedBy: d.sla?.expectedBy || '',
      sla_maxDelayMin: d.sla?.maxDelayMin ?? '',
      tags: (d.tags || []).join('|'),
      dependencies: (d.dependencies || []).join('|'),
      description: d.description || '',
      sensitivity: d.sensitivity || '',
      legal: (d.legal || []).join('|')
    }));

    const header = Object.keys(rows[0] || { empty: '' });
    const csv = [
      header.join(','),
      ...rows.map(r =>
        header.map(h => this.csvCell((r as any)[h])).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'datasets.csv';
    a.click();
    URL.revokeObjectURL(url);

    this.toast.success('Export CSV prêt 📄');

    this.logCatalogEvent({
      action: 'CATALOG_EXPORT_CSV',
      comment: `Export CSV catalogue (${data.length} lignes)`,
      count: data.length,
      q: this.q(),
      sortBy: this.sortBy(),
      onlyFav: this.onlyFav(),
      tableView: this.tableView(),
      groupByDomain: this.groupByDomain(),
      domains: [...this.domainSet()],
      statuses: [...this.statusSet()],
      tags: [...this.tagSet()],
      owners: [...this.ownerSet()],
      sensitivity: this.selectedSensitivity() || null,
      legal: this.selectedLegal() || null
    });
  }

  private csvCell(v: any) {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  async copyShareLink() {
    const params = new URLSearchParams();

    if (this.q()) params.set('q', this.q());
    if (this.sortBy() !== 'name') params.set('sort', this.sortBy());
    if (this.tableView()) params.set('view', 'table');
    if (this.groupByDomain()) params.set('group', '1');
    if (this.onlyFav()) params.set('fav', '1');
    if (this.domainSet().size) params.set('dom', [...this.domainSet()].join('|'));
    if (this.statusSet().size) params.set('st', [...this.statusSet()].join('|'));
    if (this.tagSet().size) params.set('tag', [...this.tagSet()].join('|'));
    if (this.ownerSet().size) params.set('own', [...this.ownerSet()].join('|'));
    if (this.selectedSensitivity()) {
      params.set('sens', this.selectedSensitivity() as string);
    }
    if (this.selectedLegal()) {
      params.set('legal', this.selectedLegal() as string);
    }

    const qs = params.toString();
    const link = qs
      ? `${location.origin}${location.pathname}?${qs}`
      : `${location.origin}${location.pathname}`;

    try {
      await navigator.clipboard.writeText(link);
      this.toast.success('Lien copié dans le presse-papiers 🔗');

      this.logCatalogEvent({
        action: 'CATALOG_SHARE_LINK',
        comment: 'Partage de la vue catalogue',
        link,
        q: this.q(),
        sortBy: this.sortBy(),
        tableView: this.tableView(),
        groupByDomain: this.groupByDomain(),
        onlyFav: this.onlyFav()
      });
    } catch (err) {
      this.toast.error('Impossible de copier le lien');

      this.logCatalogEvent(
        {
          action: 'CATALOG_SHARE_LINK_ERROR',
          comment: 'Erreur lors de la copie du lien catalogue',
          error: String(err)
        },
        'error'
      );
    }
  }

  private restoreFromUrl() {
    const u = new URL(location.href);

    const getSet = (k: string) =>
      new Set((u.searchParams.get(k) || '').split('|').filter(Boolean));

    if (u.searchParams.get('q')) this.q.set(u.searchParams.get('q')!);
    if (u.searchParams.get('sort')) {
      this.sortBy.set(u.searchParams.get('sort') as SortKey);
    }
    if (u.searchParams.get('view') === 'table') this.tableView.set(true);
    if (u.searchParams.get('group') === '1') this.groupByDomain.set(true);
    if (u.searchParams.get('fav') === '1') this.onlyFav.set(true);

    const d = getSet('dom');
    if (d.size) this.domainSet.set(d as any);

    const s = getSet('st');
    if (s.size) this.statusSet.set(s as any);

    const t = getSet('tag');
    if (t.size) this.tagSet.set(t as any);

    const o = getSet('own');
    if (o.size) this.ownerSet.set(o as any);

    const sens = u.searchParams.get('sens');
    if (sens) this.selectedSensitivity.set(sens as Sensitivity);

    const legal = u.searchParams.get('legal');
    if (legal) this.selectedLegal.set(legal as LegalTag);
  }

  private autoOpenDataset(urn: string) {
    if (!urn) return;

    const match = this.filtered().find(d => d.urn === urn);
    if (!match) {
      console.warn('Dataset not found for URN:', urn);
      return;
    }

    this.scrollToDataset(urn);
    this.pendingDatasetUrn = null;

    this.logCatalogEvent({
      action: 'DATASET_AUTO_FOCUS',
      comment: `Auto-focus catalogue pour dataset "${match.name}"`,
      datasetId: match.id,
      datasetUrn: match.urn
    });
  }

  private scrollToDataset(urn: string) {
    setTimeout(() => {
      const id = 'dataset-' + urn;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('catalog-highlight');
        setTimeout(() => el.classList.remove('catalog-highlight'), 3000);
      }
    }, 300);
  }
}
