import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type Params = Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

@Injectable({ providedIn: 'root' })
export class ApiHttpClient {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private bodyOpts(options?: { params?: Params }) {
    return { ...(options || {}), observe: 'body' as const };
  }

  get<T>(path: string, options?: { params?: Params }) {
    return this.http.get<T>(`${this.base}${path}`, this.bodyOpts(options));
  }

  post<T>(path: string, body: any, options?: { params?: Params }) {
    return this.http.post<T>(`${this.base}${path}`, body, this.bodyOpts(options));
  }

  put<T>(path: string, body: any, options?: { params?: Params }) {
    return this.http.put<T>(`${this.base}${path}`, body, this.bodyOpts(options));
  }

  delete<T>(path: string, options?: { params?: Params }) {
    return this.http.delete<T>(`${this.base}${path}`, this.bodyOpts(options));
  }
}
