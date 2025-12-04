
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { EtlAlert } from './models/alert';

const LS_KEY = 'etl_alerts';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private $ = new BehaviorSubject<EtlAlert[]>(this.load());

  list(): Observable<EtlAlert[]> { return this.$.asObservable(); }

  seedIfEmpty() {
    if (this.$.value.length) return;
    const now = Date.now();
    const demo: EtlAlert[] = [
      { id: uuid(), createdAt: new Date(now-3_600_000).toISOString(), severity:'ERROR',   source:'RUN',   runId:'r1', flowType:'EXPEDITIONS', message:'FAILED: Timeout', acknowledged:false },
      { id: uuid(), createdAt: new Date(now-2_600_000).toISOString(), severity:'WARN',    source:'SLA',   flowType:'COMMANDES', message:'SLA dépassé de 12 min', acknowledged:false },
      { id: uuid(), createdAt: new Date(now-1_600_000).toISOString(), severity:'CRITICAL',source:'SYSTEM', message:'Espace disque < 5%', acknowledged:false },
    ];
    this.set(demo);
  }

  acknowledge(ids: string[]) {
    const updated = this.$.value.map(a => ids.includes(a.id) ? { ...a, acknowledged: true } : a);
    this.set(updated);
    return of(true);
  }

  add(a: EtlAlert) { this.set([a, ...this.$.value]); return of(a); }

  private set(v: EtlAlert[]) { localStorage.setItem(LS_KEY, JSON.stringify(v)); this.$.next(v); }
  private load(): EtlAlert[] { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
}
