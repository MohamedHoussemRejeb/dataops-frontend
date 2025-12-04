import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuditEvent, AuditKind } from './models/audit-event';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  // 👇 aligné avec le backend: /api/audit/events
  private readonly api = `${environment.apiBaseUrl}/audit/events`;

  /** All events loaded from backend */
  private _events = signal<AuditEvent[]>([]);

  /** Sorted (newest first) – used by your component */
  events = computed(() =>
    this._events()
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  );

  constructor() {
    // tu peux garder ça, ou appeler load() depuis ton component
    this.load();
  }

  /** Load last events from backend (optionally with from/to) */
  load(opts?: { from?: string; to?: string }) {
    let params = new HttpParams();
    if (opts?.from) params = params.set('from', opts.from);
    if (opts?.to) params = params.set('to', opts.to);

    this.http.get<AuditEvent[]>(this.api, { params }).subscribe({
      next: (events) => {
        this._events.set(events || []);
      },
      error: (err) => {
        console.error('[Audit] error loading events from backend', err);
      },
    });
  }

  /**
   * Log an event to backend.
   * Utile par ex. pour les `comment` ou actions UI côté front.
   * Le backend ignore l'id et peut recalculer `at` si tu veux.
   */
  log(kind: AuditKind, user: AuditEvent['user'], meta?: AuditEvent['meta']) {
    const payload: Omit<AuditEvent, 'id'> = {
      kind,
      user,
      at: new Date().toISOString(),
      meta,
    };

    return this.http.post<AuditEvent>(this.api, payload).subscribe({
      next: (saved) => {
        // on prépend l'event renvoyé par le backend
        this._events.update((list) => [saved, ...list]);
      },
      error: (err) => {
        console.error('[Audit] error logging event', err);
      },
    });
  }

  /** Clear only the local list (does NOT clear DB) */
  clear() {
    this._events.set([]);
  }
}
