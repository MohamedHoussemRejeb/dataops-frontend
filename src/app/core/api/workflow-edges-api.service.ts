// src/app/core/api/workflow-edges-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkflowEdge } from '../models/workflow-edge.model';

@Injectable({ providedIn: 'root' })
export class WorkflowEdgesApiService {
  private http = inject(HttpClient);

  // ❌ AVANT (doublon /api)
  // private baseUrl = `${environment.apiBaseUrl}/api/workflow-edges`;

  // ✅ APRES : on enlève le /api en trop

  private baseUrl = `${environment.apiBaseUrl}/workflow-edges`;

  list(): Observable<WorkflowEdge[]> {
    return this.http.get<WorkflowEdge[]>(this.baseUrl);
  }

  create(edge: Partial<WorkflowEdge>): Observable<WorkflowEdge> {
    return this.http.post<WorkflowEdge>(this.baseUrl, edge);
  }

  update(id: number, edge: Partial<WorkflowEdge>): Observable<WorkflowEdge> {
    return this.http.put<WorkflowEdge>(`${this.baseUrl}/${id}`, edge);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  toggleEnabled(id: number): Observable<WorkflowEdge> {
    return this.http.post<WorkflowEdge>(`${this.baseUrl}/${id}/toggle-enabled`, {});
  }

  toggleOnSuccessOnly(id: number): Observable<WorkflowEdge> {
    return this.http.post<WorkflowEdge>(`${this.baseUrl}/${id}/toggle-success`, {});
  }
}
