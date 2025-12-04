// src/app/core/dashboard.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ----------------------------------------------
// TYPES DU DASHBOARD (à harmoniser avec backend)
// ----------------------------------------------

export interface RiskyDataset {
  id: number;
  urn: string;
  name: string;
  domain?: string;
  lastStatus: string;
  riskScore: number;
}

export interface DomainKpi {
  domain: string;
  failedRate: number;
  slaRespectRate: number;
  riskScore: number;
}

export interface TopError {
  code: string;
  message: string;
  count7d: number;
}

export interface DashboardSummary {
  runsToday: number;
  failedRate: number;
  slaRespectRate: number;
  domains: DomainKpi[];
  topDatasets: RiskyDataset[];
  topErrors: TopError[];
}

// Timeseries (pour les graphes Run / SLA)
export interface RunDayPoint {
  day: string;
  total: number;
  failed: number;
}

export interface SlaDayPoint {
  day: string;
  ok: number;
  late: number;
  failed: number;
}

export interface TimeseriesResponse {
  runs: RunDayPoint[];
  sla: SlaDayPoint[];
}

// ----------------------------------------------
// SERVICE
// ----------------------------------------------

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  // API base URL (ex: http://localhost:8083/api/dashboard)
  private baseUrl = `${environment.apiBaseUrl}/dashboard`;

  // --- Résumé global (KPI, top datasets, domaines...)
  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/summary`);
  }

  // --- Graphes timeseries (runs + SLA)
  getTimeseries(days: number): Observable<TimeseriesResponse> {
    return this.http.get<TimeseriesResponse>(
      `${this.baseUrl}/timeseries?days=${days}`
    );
  }
}
