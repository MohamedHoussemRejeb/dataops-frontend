import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccessEntry, LegalTag, Sensitivity, StewardRole } from '../models/governance.models';
import { environment } from '../../../environments/environment';  // 👈 adapte le chemin si besoin

export interface AccessMatrixQuery {
  q?: string;
  role?: StewardRole;
  sensitivity?: Sensitivity;
  legal?: LegalTag;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class AccessApiService {
  private base = `${environment.apiBaseUrl}/governance`;

  constructor(private http: HttpClient) {}

  listMatrix(q: AccessMatrixQuery): Observable<{ total: number; items: AccessEntry[] }> {

    // 🔹 defaults required by backend
    q = {
      page: q.page ?? 1,
      size: q.size ?? 25,
      ...q
    };

    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    }
    params = params.set('_t', String(Date.now())); // anti-cache

    // 🔥 endpoint exact = /api/governance/access-matrix
    const url = `${this.base}/access-matrix`;

    console.debug(
      '[API] GET', url,
      'params=',
      Object.fromEntries((params as any).keys().map((k: string) => [k, params.get(k)]))
    );

    return this.http.get<{ total: number; items: AccessEntry[] }>(url, { params });
  }
  rebuildMatrix(): Observable<void> {
  return this.http.post<void>(`${this.base}/access-matrix/rebuild`, {});
}
}
