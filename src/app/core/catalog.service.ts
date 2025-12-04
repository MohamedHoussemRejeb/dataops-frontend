import { Injectable, inject } from '@angular/core';
import { ApiHttpClient } from './api/http.client';
import { Observable } from 'rxjs';

export type Risk = 'OK' | 'RISK' | 'UNKNOWN';

export interface CatalogItem {
  urn: string;
  name: string;
  owner?: { name: string; email?: string };
  tags?: string[];
  trust: number;      // 0..100
  risk: Risk;         // OK|RISK|UNKNOWN
}

export interface Paged<T> { items: T[]; total: number }

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(ApiHttpClient);

  list(params: { query?: string; page?: number; pageSize?: number }): Observable<Paged<CatalogItem>> {
    return this.http.get<Paged<CatalogItem>>('/catalog', { params });
  }
}
