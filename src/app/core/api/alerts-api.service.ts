// src/app/core/api/alerts-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { EtlAlert } from '../models/alert';
import { environment } from '../../../environments/environment';

export interface AckRequest {
  ids: string[];
}

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private baseUrl = `${environment.apiBaseUrl}/alerts`;

  constructor(private http: HttpClient) {}

  list(): Observable<EtlAlert[]> {
    return this.http.get<EtlAlert[]>(this.baseUrl, {
      headers: this.authHeaders()
    });
  }

  acknowledge(ids: string[]): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/ack`,
      { ids } as AckRequest,
      { headers: this.authHeaders() }
    );
  }

  // helper: Auth Basic pour Spring Security
  private authHeaders(): HttpHeaders {
    const basic = btoa('admin:admin'); // doit matcher SecurityConfig
    return new HttpHeaders({
      Authorization: `Basic ${basic}`
    });
  }
}
