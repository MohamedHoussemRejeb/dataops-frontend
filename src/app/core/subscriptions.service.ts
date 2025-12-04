import { Injectable, signal, effect } from '@angular/core';

const LS_KEY = 'app.subscriptions.v1';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  /** ids des datasets suivis */
  readonly ids = signal<Set<string>>(this.load());

  /** vrai si l’id est suivi */
  is(id: string) { return this.ids().has(id); }

  /** toggle */
  toggle(id: string) {
    const next = new Set(this.ids());
    next.has(id) ? next.delete(id) : next.add(id);
    this.ids.set(next);
  }

  /** nombre total de suivis */
  count() { return this.ids().size; }

  /** comparator utilitaire : abonnés en tête */
  boostFirst<T extends { id: string }>() {
    const favs = this.ids();
    return (a: T, b: T) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0);
  }

  // ——— persistence ———
  private load(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
    catch { return new Set(); }
  }
  private _persist = effect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify([...this.ids()]));
  });
}
