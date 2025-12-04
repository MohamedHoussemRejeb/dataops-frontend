import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatReportRequest, ChatReportResponse } from '../../app/core/models/chatbot.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatbotApiService {
  // Exemple : environment.apiBaseUrl = 'http://localhost:8083/api';
  private readonly baseUrl = `${environment.apiBaseUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  /**
   * Simple question / réponse texte (POST /api/chatbot/ask)
   */
  ask(prompt: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/ask`, { prompt }, {
      responseType: 'text' // IMPORTANT: le backend renvoie du text/plain
    });
  }

  /**
   * Rapport JSON (POST /api/chatbot/report)
   */
  generateReport(body: ChatReportRequest): Observable<ChatReportResponse> {
    return this.http.post<ChatReportResponse>(`${this.baseUrl}/report`, body);
  }

  /**
   * Rapport JSON sur les 2 derniers runs (POST /api/chatbot/report/latest)
   */
  generateLatestReport(
    provider?: string,
    model?: string,
    extra?: string
  ): Observable<ChatReportResponse> {
    const payload: any = {
      runAId: null, // ignoré par generateLatest côté backend
      runBId: null,
      provider,
      model,
      extra
    };
    return this.http.post<ChatReportResponse>(`${this.baseUrl}/report/latest`, payload);
  }

  /**
   * Rapport Markdown brut (GET /api/chatbot/report?runAId&runBId)
   */
  getMarkdownReport(runAId: number, runBId: number): Observable<string> {
    const params = new HttpParams()
      .set('runAId', runAId)
      .set('runBId', runBId);

    return this.http.get(`${this.baseUrl}/report`, {
      params,
      responseType: 'text' // "text/markdown" -> à traiter toi-même
    });
  }

  /**
   * Rapport HTML complet (GET /api/chatbot/report/html?...)
   * Tu peux soit l'afficher dans un <iframe>, soit ouvrir dans un nouvel onglet.
   */
  getHtmlReport(runAId: number, runBId: number,
                provider?: string, model?: string, extra?: string): Observable<string> {
    let params = new HttpParams()
      .set('runAId', runAId)
      .set('runBId', runBId);
    if (provider) params = params.set('provider', provider);
    if (model) params = params.set('model', model);
    if (extra) params = params.set('extra', extra);

    return this.http.get(`${this.baseUrl}/report/html`, {
      params,
      responseType: 'text'
    });
  }

  /**
   * HTML pour les 2 derniers runs (GET /api/chatbot/report/latest/html)
   */
  getLatestHtmlReport(provider?: string, model?: string, extra?: string): Observable<string> {
    let params = new HttpParams();
    if (provider) params = params.set('provider', provider);
    if (model) params = params.set('model', model);
    if (extra) params = params.set('extra', extra);

    return this.http.get(`${this.baseUrl}/report/latest/html`, {
      params,
      responseType: 'text'
    });
  }
}
