// src/app/core/audit.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditPage } from './audit';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/api/audit`;

  getLogs(options: {
    actor?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    fromTs?: string;
    toTs?: string;
    page?: number;
    size?: number;
  }): Observable<AuditPage> {
    let params = new HttpParams();

    if (options.actor) params = params.set('actor', options.actor);
    if (options.action) params = params.set('action', options.action);
    if (options.resourceType) params = params.set('resourceType', options.resourceType);
    if (options.resourceId) params = params.set('resourceId', options.resourceId);
    if (options.fromTs) params = params.set('fromTs', options.fromTs);
    if (options.toTs) params = params.set('toTs', options.toTs);

    params = params
      .set('page', (options.page ?? 0).toString())
      .set('size', (options.size ?? 20).toString());

    return this.http.get<AuditPage>(this.baseUrl, { params });
  }
}
