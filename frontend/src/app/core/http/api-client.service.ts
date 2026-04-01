import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiNormalizerService } from './api-normalizer.service';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

interface RequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  withCredentials?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private http = inject(HttpClient);
  private normalizer = inject(ApiNormalizerService);
  private baseUrl = environment.apiBaseUrl;

  get<T>(url: string, options?: RequestOptions): Observable<ApiEnvelope<T>> {
    return this.http.get<any>(`${this.baseUrl}${url}`, { ...options, observe: 'response' })
      .pipe(
        timeout(30000),
        map(response => this.normalizer.normalizeSuccess<T>(response)),
        catchError((error: any) => of(this.normalizer.normalizeError<T>(error)))
      );
  }

  post<T>(url: string, body: any | null, options?: RequestOptions): Observable<ApiEnvelope<T>> {
    return this.http.post<any>(`${this.baseUrl}${url}`, body, { ...options, observe: 'response' })
      .pipe(
        timeout(30000),
        map(response => this.normalizer.normalizeSuccess<T>(response)),
        catchError((error: any) => of(this.normalizer.normalizeError<T>(error)))
      );
  }

  put<T>(url: string, body: any | null, options?: RequestOptions): Observable<ApiEnvelope<T>> {
    return this.http.put<any>(`${this.baseUrl}${url}`, body, { ...options, observe: 'response' })
      .pipe(
        timeout(30000),
        map(response => this.normalizer.normalizeSuccess<T>(response)),
        catchError((error: any) => of(this.normalizer.normalizeError<T>(error)))
      );
  }

  delete<T>(url: string, options?: RequestOptions): Observable<ApiEnvelope<T>> {
    return this.http.delete<any>(`${this.baseUrl}${url}`, { ...options, observe: 'response' })
      .pipe(
        timeout(30000),
        map(response => this.normalizer.normalizeSuccess<T>(response)),
        catchError((error: any) => of(this.normalizer.normalizeError<T>(error)))
      );
  }
}
