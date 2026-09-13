import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Thin typed wrapper over HttpClient that points at the configured API base. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private url(path: string): string {
    return `${this.base}${path}`;
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.http.get<T>(this.url(path), params ? { params } : undefined);
  }

  post<T>(path: string, body?: unknown) {
    return this.http.post<T>(this.url(path), body ?? {});
  }

  put<T>(path: string, body?: unknown) {
    return this.http.put<T>(this.url(path), body ?? {});
  }

  delete<T>(path: string) {
    return this.http.delete<T>(this.url(path));
  }

  postForm<T>(path: string, form: FormData) {
    return this.http.post<T>(this.url(path), form);
  }

  getBlob(path: string) {
    return this.http.get(this.url(path), { responseType: 'blob' });
  }
}