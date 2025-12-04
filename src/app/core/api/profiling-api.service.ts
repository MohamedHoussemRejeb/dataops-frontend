// src/app/core/api/profiling-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ColumnProfile {
  datasetUrn: string;
  column: string;
  type: string;
  min?: number; max?: number;
  nullRate: number;
  distinct: number;
  topK: Array<{ value: string; count: number }>;
  histogram: Array<{ bin: string; count: number }>;
}

@Injectable({ providedIn: 'root' })
export class ProfilingApiService {
  constructor(private http: HttpClient) {}

  getColumnProfile(urn: string, col: string): Observable<ColumnProfile> {
    return this.http.get<ColumnProfile>(`/api/datasets/${encodeURIComponent(urn)}/columns/${encodeURIComponent(col)}/profile`);
  }

  getColumnHistory(urn: string, col: string, days = 30): Observable<{ points: Array<{ t: string; nullRate: number; distinct: number }> }> {
    const params = new HttpParams().set('days', days);
    return this.http.get<{ points: Array<{ t: string; nullRate: number; distinct: number }> }>(
      `/api/profiling/columns/${encodeURIComponent(urn)}/${encodeURIComponent(col)}/history`,
      { params }
    );
  }
}
