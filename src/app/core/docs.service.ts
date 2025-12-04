import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PolicyDoc {
  id?: number;
  title: string;
  type: 'policy' | 'guideline' | 'procedure' | 'other';
  tags?: string[];
  summary?: string;
  contentUrl?: string;  // URL de téléchargement renvoyée par le back
  updatedAt?: string;   // ISO string
}

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly api = `${environment.apiBaseUrl}/docs`;

  constructor(private http: HttpClient) {}

  list(filters?: { type?: string; tag?: string; q?: string }): Observable<PolicyDoc[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.tag)  params = params.set('tag', filters.tag);
    if (filters?.q)    params = params.set('q', filters.q);

    return this.http.get<PolicyDoc[]>(this.api, { params });
  }

  get(id: number): Observable<PolicyDoc> {
    return this.http.get<PolicyDoc>(`${this.api}/${id}`);
  }

  // ⭐ Nouvelle version orientée upload (admin)
  create(meta: {
    title: string;
    type: 'policy' | 'guideline' | 'procedure' | 'other';
    summary?: string;
    tags?: string[];
  }, file: File): Observable<PolicyDoc> {
    const form = new FormData();

    form.append(
      'meta',
      new Blob([JSON.stringify(meta)], { type: 'application/json' })
    );
    form.append('file', file);

    return this.http.post<PolicyDoc>(this.api, form);
  }

  update(id: number, doc: PolicyDoc): Observable<PolicyDoc> {
    return this.http.put<PolicyDoc>(`${this.api}/${id}`, doc);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // ⭐ Helper pour le lien de téléchargement
  getFileUrl(doc: PolicyDoc): string {
    return doc.contentUrl ?? `${this.api}/${doc.id}/file`;
  }
}
