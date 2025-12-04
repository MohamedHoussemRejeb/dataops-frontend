// src/app/core/quality.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  QualitySummary,
  QualitySeries,
  Heatmap,
  ColumnProfile,
  QualityTest,        // ✅ add this
} from './models/quality';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class QualityService {
  private http = inject(HttpClient);

  // environment.apiBaseUrl = 'http://localhost:8083/api'
  private baseQuality  = `${environment.apiBaseUrl}/quality`;
  private baseDatasets = `${environment.apiBaseUrl}/datasets`;

  getSummary(): Observable<QualitySummary> {
    return this.http.get<QualitySummary>(`${this.baseQuality}/summary`);
  }

  getSeries(
    metric: 'error_rate' | 'freshness_min' | 'null_rate',
    range: '7d' | '30d'
  ): Observable<QualitySeries> {
    return this.http.get<QualitySeries>(`${this.baseQuality}/series`, {
      params: { metric, range },
    });
  }

  getHeatmap(range: '7d' | '30d'): Observable<Heatmap> {
    return this.http.get<Heatmap>(`${this.baseQuality}/heatmap`, {
      params: { range },
    });
  }

  getColumnProfile(datasetUrn: string, column: string): Observable<ColumnProfile> {
    return this.http.get<ColumnProfile>(
      `${this.baseDatasets}/${encodeURIComponent(datasetUrn)}/columns/${encodeURIComponent(column)}/profile`
    );
  }

  getDatasetLatestIncidents(datasetUrn: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseDatasets}/${encodeURIComponent(datasetUrn)}/incidents`
    );
  }

getTests(urn: string): Observable<QualityTest[]> {
  return this.http.get<QualityTest[]>(`${this.baseQuality}/tests`, {
    params: {urn},
  });
}
}
