import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ColumnSearchItem {
  urn: string;
  dataset: string;
  column: string;
  type?: string;
  sensitivity?: string;
}

export interface ColumnGraph {
  nodes: Array<{ id: string; label: string; type: 'column' | 'job' | 'dataset' }>;
  edges: Array<{ from: string; to: string; kind: string }>;
}

@Injectable({ providedIn: 'root' })
export class LineageApi {
  private base = 'http://localhost:8083/api/lineage';

  constructor(private http: HttpClient) {}

  /** Recherche de colonnes */
  searchColumns(q: string): Observable<{ items: ColumnSearchItem[] }> {
    const params = new HttpParams().set('q', q ?? '');
    return this.http.get<{ items: ColumnSearchItem[] }>(
      `${this.base}/columns/search`,
      { params }
    );
  }

  /** Mini graphe lineage pour une colonne */
  columnGraph(datasetUrn: string, column: string): Observable<ColumnGraph> {
    const u = encodeURIComponent(datasetUrn);
    const c = encodeURIComponent(column);
    return this.http.get<ColumnGraph>(`${this.base}/columns/${u}/${c}`);
  }
}
