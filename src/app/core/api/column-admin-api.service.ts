// src/app/core/api/column-admin-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DatasetColumn {
  id?: number;
  name: string;
  type?: string;
  sensitivity?: string;
}

export interface ColumnEdge {
  id?: number;
  fromColumnId: number;
  toColumnId: number;
  kind: string;
}

@Injectable({ providedIn: 'root' })
export class ColumnAdminApi {

  // 🔥 => URL exacte du backend
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ---- COLUMNS ----
  listColumns(datasetId: number): Observable<DatasetColumn[]> {
    return this.http.get<DatasetColumn[]>(
      `${this.base}/catalog/datasets/${datasetId}/columns`
    );
  }

  createColumn(datasetId: number, col: DatasetColumn): Observable<DatasetColumn> {
    return this.http.post<DatasetColumn>(
      `${this.base}/catalog/datasets/${datasetId}/columns`,
      col
    );
  }

  updateColumn(datasetId: number, col: DatasetColumn): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(
      `${this.base}/catalog/datasets/${datasetId}/columns/${col.id}`,
      col
    );
  }

  deleteColumn(datasetId: number, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/catalog/datasets/${datasetId}/columns/${id}`
    );
  }

  // ---- EDGES ----
  listEdges(datasetId: number): Observable<ColumnEdge[]> {
    const params = new HttpParams().set('datasetId', datasetId.toString());
    return this.http.get<ColumnEdge[]>(
      `${this.base}/lineage/column-edges`,
      { params }
    );
  }

  createEdge(edge: ColumnEdge): Observable<ColumnEdge> {
    return this.http.post<ColumnEdge>(
      `${this.base}/lineage/column-edges`,
      edge
    );
  }

  updateEdge(edge: ColumnEdge): Observable<ColumnEdge> {
    return this.http.put<ColumnEdge>(
      `${this.base}/lineage/column-edges/${edge.id}`,
      edge
    );
  }

  deleteEdge(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/lineage/column-edges/${id}`
    );
  }
}
