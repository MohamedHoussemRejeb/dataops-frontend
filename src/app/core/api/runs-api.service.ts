import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders
} from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  EtlRun,
  Status,
  FlowType,
  Trigger,
  RunMetadata
} from '../models/etl-run';
import { environment } from '../../../environments/environment';

// Basic Auth helper
function basicAuthHeader(user: string, pass: string): HttpHeaders {
  const token = btoa(`${user}:${pass}`);
  return new HttpHeaders({ Authorization: `Basic ${token}` });
}

@Injectable({ providedIn: 'root' })
export class RunsApiService {
  private baseUrl = `${environment.apiBaseUrl}/api/etl/runs`;
  private headers = basicAuthHeader('admin', 'admin');

  constructor(private http: HttpClient) {}

  // ========================================
  //  LIST RUNS
  // ========================================
  list(): Observable<EtlRun[]> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '200')
      .set('sort', 'createdAt,desc');

    return this.http
      .get<any>(this.baseUrl, { params, headers: this.headers })
      .pipe(
        map(page => {
          const raw = Array.isArray(page?.content) ? page.content : [];

          return raw.map((b: any): EtlRun => {
            const status = (b.status ?? 'RUNNING') as Status;
            const flowType = (b.jobName || 'UNKNOWN')
              .toUpperCase() as FlowType;

            const trigger: Trigger = 'SCHEDULED';

            return {
              id: String(b.id),
              flowType,
              status,
              startTime: b.startedAt,
              endTime: b.finishedAt ?? undefined,
              rowsIn: b.rowsIn ?? undefined,
              rowsOut: b.rowsOut ?? undefined,
              rowsError: undefined,
              durationMs: b.durationMs ?? undefined,
              sourceFile: undefined,
              message: status === 'FAILED' ? 'Échec' : 'OK',
              trigger,
              progress: undefined,
              dryRun: false,
              retryParams: undefined
            };
          });
        })
      );
  }

  // ========================================
  //  GET METADATA — nouveau endpoint
  // ========================================
  getMetadata(runId: string | number): Observable<RunMetadata> {
    return this.http.get<RunMetadata>(
      `${this.baseUrl}/${runId}/meta`,
      { headers: this.headers }
    );
  }
}
