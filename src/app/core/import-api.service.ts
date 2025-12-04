// import-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type ColumnType = 'number'|'integer'|'date'|'boolean'|'categorical'|'string';

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  nullable: boolean;
  confidence?: number;
}

export interface PreviewBody {
  sourceType: 'csv' | 'excel' | 'ocr';
  rows: any[];
  schema?: ColumnSchema[];
}

export interface PreviewResp {
  sample: any[];
  schema: ColumnSchema[];
  warnings: string[];
}

export interface CommitBody {
  datasetId: string;
  rows: any[];
  schema: ColumnSchema[];
  options?: { upsertKey?: string; dedupe?: boolean; [k: string]: any };
}

export interface CommitResp {
  inserted: number;
  updated?: number;
  rejected?: number;
  errors?: any[];
  ok?: boolean;      // côté Spring plus tard
  txId?: string;     // côté Spring plus tard
}

@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private http = inject(HttpClient);

  /**
   * Base URL:
   * - en dev FastAPI:  http://localhost:8000
   * - derrière gateway/Spring: laisse vide ('') pour routes relatives /api/...
   */
  private base =
    (window as any).__API_BASE__ ??
    (location.hostname === 'localhost' ? 'http://localhost:8000' : '');

  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  preview(body: PreviewBody): Observable<PreviewResp> {
    return this.http
      .post<PreviewResp>(`${this.base}/api/import/preview`, body, { headers: this.jsonHeaders })
      .pipe(catchError(this.handle));
  }

  commit(body: CommitBody): Observable<CommitResp> {
    // dispo quand ton endpoint Spring /api/import/commit sera prêt
    return this.http
      .post<CommitResp>(`${this.base}/api/import/commit`, body, { headers: this.jsonHeaders })
      .pipe(catchError(this.handle));
  }

  ocrExtract(file: File): Observable<{ text: string; rows?: any[] }> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<{ text: string; rows?: any[] }>(`${this.base}/api/ocr/extract`, form)
      .pipe(catchError(this.handle));
  }

  private handle(err: HttpErrorResponse) {
    const msg =
      (typeof err.error === 'string' && err.error) ||
      err.error?.message ||
      err.message ||
      'Erreur réseau';
    return throwError(() => new Error(msg));
  }
}
