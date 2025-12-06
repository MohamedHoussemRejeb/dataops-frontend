// src/app/core/api/live-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LiveRun {
  id: string;
  flowType: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  startTime: string;
  endTime?: string | null;
  progress?: number | null;
  dryRun?: boolean | null;
}

export interface LiveLog {
  id: number;
  runId: string;
  ts: string;
  level: 'INFO' | 'WARN' | 'ERROR' | string;
  msg: string;
}

@Injectable({ providedIn: 'root' })
export class LiveApiService {

  // backend Spring Boot
  private readonly baseUrl = `${environment.apiBaseUrl}/api/live`;

  constructor(private http: HttpClient) {}

  getRunning(): Observable<LiveRun[]> {
    return this.http.get<LiveRun[]>(`${this.baseUrl}/runs`);
  }

  getLogs(runId: string): Observable<LiveLog[]> {
    return this.http.get<LiveLog[]>(`${this.baseUrl}/runs/${runId}/logs`);
  }

  startTalendArticle(): Observable<LiveRun> {
    return this.http.post<LiveRun>(`${this.baseUrl}/runs/talend/article`, {});
  }

  startTalendCommande(): Observable<LiveRun> {
    return this.http.post<LiveRun>(`${this.baseUrl}/runs/talend/commande`, {});
  }

  startTalendAnnulation(): Observable<LiveRun> {
    return this.http.post<LiveRun>(`${this.baseUrl}/runs/talend/annulation`, {});
  }

  startTalendMvtStock(): Observable<LiveRun> {
    return this.http.post<LiveRun>(`${this.baseUrl}/runs/talend/mvt-stock`, {});
  }
}
