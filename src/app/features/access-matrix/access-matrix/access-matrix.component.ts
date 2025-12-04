// src/app/features/governance/access-matrix/access-matrix.component.ts
import {
  Component,
  effect,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AccessEntry,
  LegalTag,
  Sensitivity,
  StewardRole
} from '../../../core/models/governance.models';

import {
  AccessApiService,
  AccessMatrixQuery
} from '../../../core/api/access-api.service';

import {
  RealtimeEventsService,
  RealtimeEvent
} from '../../../core/realtime-events.service';

import { ToastService } from '../../../core/toast.service';

@Component({
  standalone: true,
  selector: 'app-access-matrix',
  imports: [
    CommonModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatButtonModule
  ],
  templateUrl: './access-matrix.component.html',
  styleUrls: ['./access-matrix.component.scss']
})
export class AccessMatrixComponent {
  readonly cols = ['person', 'dataset', 'access'] as const;

  readonly sensitivities: Sensitivity[] = [
    'public',
    'internal',
    'confidential',
    'sensitive',
    'pii',
    'phi',
    'secret'
  ];

  readonly legalTags: LegalTag[] = ['rgpd', 'law25', 'hipaa', 'sox', 'pci'];

  // 🔍 Filtres
  readonly q = signal<string>('');
  readonly role = signal<StewardRole | 'any'>('any');
  readonly sensitivity = signal<Sensitivity | 'any'>('any');
  readonly legal = signal<LegalTag | 'any'>('any');

  // 📄 Pagination
  readonly page = signal<number>(1);
  readonly size = signal<number>(25);

  // ⏱️ État
  readonly loading = signal<boolean>(false);
  readonly total = signal<number>(0);
  readonly rows = signal<AccessEntry[]>([]);

  // 🔁 pour forcer un reload sans changer les filtres
  readonly reloadTick = signal<number>(0);

  // 🔁 état rebuild matrix
  readonly rebuildLoading = signal<boolean>(false);

  private readonly api = inject(AccessApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly realtime = inject(RealtimeEventsService); // 💡 public pour le template
  private readonly toast = inject(ToastService);

  // 🧮 dérivés
  readonly byUser = computed(() =>
    this.rows()
      .slice()
      .sort(
        (a, b) =>
          a.person.name.localeCompare(b.person.name) ||
          a.dataset.name.localeCompare(b.dataset.name)
      )
  );

  readonly byDataset = computed(() =>
    this.rows()
      .slice()
      .sort(
        (a, b) =>
          a.dataset.name.localeCompare(b.dataset.name) ||
          a.person.name.localeCompare(b.person.name)
      )
  );

  constructor() {
    // 📥 initialisation depuis les query params
    const qp = this.route.snapshot.queryParamMap;

    this.q.set((qp.get('q') ?? '').trim());
    this.role.set((qp.get('role') as StewardRole | 'any') ?? 'any');
    this.sensitivity.set(
      (qp.get('sensitivity') as Sensitivity | 'any') ?? 'any'
    );
    this.legal.set((qp.get('legal') as LegalTag | 'any') ?? 'any');
    this.page.set(Number(qp.get('page') ?? 1) || 1);
    this.size.set(Number(qp.get('size') ?? 25) || 25);

    // 🔁 chargement + synchro URL
    effect(() => {
      // 🔔 on consomme le tick juste pour dépendre dessus
      this.reloadTick();

      const query: AccessMatrixQuery = {
        q: this.q() || undefined,
        role: this.role() !== 'any' ? (this.role() as StewardRole) : undefined,
        sensitivity:
          this.sensitivity() !== 'any'
            ? (this.sensitivity() as Sensitivity)
            : undefined,
        legal:
          this.legal() !== 'any' ? (this.legal() as LegalTag) : undefined,
        page: this.page(),
        size: this.size()
      };

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          q: this.q() || null,
          role: this.role() !== 'any' ? this.role() : null,
          sensitivity:
            this.sensitivity() !== 'any' ? this.sensitivity() : null,
          legal: this.legal() !== 'any' ? this.legal() : null,
          page: this.page(),
          size: this.size()
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });

      this.loading.set(true);
      this.api.listMatrix(query).subscribe({
        next: (res) => {
          this.rows.set(res.items || []);
          this.total.set(res.total ?? res.items?.length ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('access matrix error', err);
          this.rows.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.toast.error('Erreur lors du chargement de la matrice d’accès.');
        }
      });
    });

    // 🔥 auto-refresh en cas d’évènement temps réel
    effect(() => {
      const ev: RealtimeEvent | null = this.realtime.lastEvent();
      if (!ev || !this.realtime.autoRefresh()) return;

      if (ev.type === 'ACCESS_CHANGED') {
        // on force un nouveau chargement
        this.reloadTick.set(this.reloadTick() + 1);
      }
    });
  }

  // 📄 changement page
  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex + 1);
    this.size.set(e.pageSize);
  }

  // 🏷️ label lisible pour les tags légaux
  label(l: LegalTag): string {
    return (
      {
        rgpd: 'RGPD',
        law25: 'Loi 25',
        hipaa: 'HIPAA',
        sox: 'SOX',
        pci: 'PCI DSS'
      }[l] ?? l
    );
  }

  // 🎨 classe CSS en fonction du niveau d’accès
  accessClass(access: string): string {
    const val = (access || '').toLowerCase();
    if (val.includes('owner')) return 'access-owner';
    if (val.includes('steward')) return 'access-steward';
    if (val.includes('admin')) return 'access-admin';
    return 'access-viewer';
  }

  // 🅰️ initiale de l’utilisateur pour l’avatar
  avatarInitial(entry: AccessEntry): string {
    const n = entry.person?.name ?? '?';
    return n.charAt(0).toUpperCase();
  }

  // 🔗 ouvrir dataset dans le Catalogue
  openDataset(urn?: string): void {
    if (!urn) return;
    this.router.navigate(['/catalog'], {
      queryParams: { dataset: urn }
    });
  }

  // ⚡ trackBy pour les lignes, pour optimiser le rendu
  trackRow(_: number, r: AccessEntry): string {
    const email = r.person?.email ?? '';
    const urn = r.dataset?.urn ?? '';
    const access = r.access ?? '';
    return `${email}::${urn}::${access}`;
  }

  // 🔁 bouton "Rebuild matrix"
  onRebuildClick(): void {
    if (this.rebuildLoading()) return;
    this.rebuildLoading.set(true);

    this.api.rebuildMatrix().subscribe({
      next: () => {
        this.rebuildLoading.set(false);
        this.toast.success('Matrice d’accès recalculée.');
        // on force un rechargement
        this.reloadTick.set(this.reloadTick() + 1);
      },
      error: (err) => {
        console.error('rebuild matrix error', err);
        this.rebuildLoading.set(false);
        this.toast.error('Erreur lors du rebuild de la matrice.');
      }
    });
  }
}
