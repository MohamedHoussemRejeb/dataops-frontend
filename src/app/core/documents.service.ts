import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { DocumentDto } from './models/document';
@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly api = `${environment.apiBaseUrl}/docs`;

  constructor(private http: HttpClient) {}

  list(params?: { type?: string; tag?: string; q?: string }) {
    return this.http.get<DocumentDto[]>(this.api, { params: params as any });
  }

  create(doc: DocumentDto) {
    return this.http.post<DocumentDto>(this.api, doc);
  }

  // etc.
}
