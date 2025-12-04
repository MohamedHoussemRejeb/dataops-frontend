import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SourceHealth } from './models/source';  // ⬅️ nouveau modèle
// import { environment } from '../../environments/environment'; // si tu veux

@Injectable({ providedIn: 'root' })
export class SourcesService {
  private base = '/api/sources'; 
  // ou: private base = `${environment.apiBaseUrl}/api/sources`;

  constructor(private http: HttpClient) {}

  /** Liste toutes les sources avec leur health (status, last success, latency, ...) */
  list(): Observable<SourceHealth[]> {
    return this.http.get<SourceHealth[]>(this.base);
  }

  /** Détail d'une source (si tu ajoutes GET /api/sources/{id} côté backend) */
  get(id: number): Observable<SourceHealth> {
    return this.http.get<SourceHealth>(`${this.base}/${id}`);
  }

  /** Lance un test de connexion pour UNE source */
  testConnection(id: number): Observable<SourceHealth> {
    return this.http.post<SourceHealth>(`${this.base}/${id}/test-connection`, {});
  }

  /** Lance un test de connexion pour TOUTES les sources */
  testAll(): Observable<SourceHealth[]> {
    return this.http.post<SourceHealth[]>(`${this.base}/test-all`, {});
  }
}
