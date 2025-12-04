import { Injectable, computed, signal, inject } from '@angular/core';
import { of, combineLatest, map, shareReplay, Observable } from 'rxjs';
import { DatasetService } from './dataset.service';

// ---- types (remplace par tes vrais modèles si tu en as) ----
export type SearchKind = 'dataset' | 'run' | 'error';

export interface SearchItem {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  score?: number;
  raw?: any;
}

// exemples de modèles (à remplacer si besoin)
type Run = { id: string; name: string; status: string; endedAt?: string };
type Err = { id: string; title: string; runId?: string; level: 'WARN' | 'ERROR'; createdAt?: string };

@Injectable({ providedIn: 'root' })
export class SearchService {
  private datasets = inject(DatasetService);

  // ---- Mocks convertis en vrais Observables RxJS ----
  private runs$: Observable<Run[]> = of<Run[]>([
    { id: '101', name: 'Daily Sales ETL',  status: 'OK',     endedAt: new Date().toISOString() },
    { id: '102', name: 'Customer Merge',   status: 'FAILED', endedAt: new Date().toISOString() },
    { id: '103', name: 'Inventory Refresh',status: 'RUNNING' }
  ]).pipe(shareReplay(1));

  private errors$: Observable<Err[]> = of<Err[]>([
    { id: 'e1', title: 'Null pointer in step “join_customers”', runId: '102', level: 'ERROR' },
    { id: 'e2', title: 'Late arrival warning (Sales)', level: 'WARN' }
  ]).pipe(shareReplay(1));

  // ---- Index combiné en signal ----
  private _index = signal<SearchItem[]>([]);
  index = computed(() => this._index());

  constructor() {
    combineLatest([
      this.datasets.getDatasets(), // Observable<Dataset[]>
      this.runs$,
      this.errors$
    ])
    .pipe(
      map(([ds, runs, errs]) => {
        const items: SearchItem[] = [];

        // datasets
        for (const d of ds) {
          items.push({
            kind: 'dataset',
            id: d.id,
            title: d.name,
            subtitle: `${d.domain ?? '—'} • owner: ${d.owner?.name ?? '—'}`,
            route: `/catalog?open=${encodeURIComponent(d.id)}`,
            raw: d
          });
        }

        // runs
        for (const r of runs) {
          items.push({
            kind: 'run',
            id: r.id,
            title: r.name,
            subtitle: `${r.status}${r.endedAt ? ' • ' + new Date(r.endedAt).toLocaleString() : ''}`,
            route: `/runs/${r.id}`,
            raw: r
          });
        }

        // erreurs
        for (const e of errs) {
          items.push({
            kind: 'error',
            id: e.id,
            title: e.title,
            subtitle: `${e.level}${e.runId ? ' • run #' + e.runId : ''}`,
            route: e.runId ? `/runs/${e.runId}` : `/alerts/${e.id}`,
            raw: e
          });
        }

        return items;
      }),
      shareReplay(1)
    )
    .subscribe(all => this._index.set(all));
  }

  /** Recherche fuzzy simple */
  query(q: string, limitPerKind = 8) {
    const term = q.trim().toLowerCase();
    if (!term) return this.groupedByKind(this.index());

    const scored = this.index()
      .map(it => ({ ...it, score: this.fuzzyScore(`${it.title} ${it.subtitle ?? ''}`, term) }))
      .filter(it => (it.score ?? 0) > 0)
      .sort((a, b) => (b.score! - a.score!));

    return this.groupedByKind(scored, limitPerKind);
  }

  private groupedByKind(items: SearchItem[], limitPerKind = 8) {
    const kinds: SearchKind[] = ['run', 'dataset', 'error'];
    return kinds
      .map(k => ({ kind: k, items: items.filter(i => i.kind === k).slice(0, limitPerKind) }))
      .filter(g => g.items.length);
  }

  /** Fuzzy très léger */
  private fuzzyScore(hay: string, needle: string) {
    const h = hay.toLowerCase();
    let score = 0, idx = 0;
    for (const ch of needle) {
      const found = h.indexOf(ch, idx);
      if (found === -1) return 0;
      score += 5;
      if (found === 0 || /\W/.test(h[found - 1] ?? '')) score += 8;
      score -= Math.max(0, found - idx - 1);
      idx = found + 1;
    }
    if (h.startsWith(needle)) score += 15;
    return Math.max(1, score);
  }
}
