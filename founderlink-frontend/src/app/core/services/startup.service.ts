import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope, ApiResponse, PagedResponse, StartupRequest, StartupResponse } from '../../models';
import { normalizeWrapped, normalizeError } from './api-normalizer';

@Injectable({ providedIn: 'root' })
export class StartupService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiEnvelope<StartupResponse[]>> {
    return this.http.get<ApiResponse<StartupResponse[]>>(`${this.api}/startup`).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  /** Paginated startup discovery — triggers backend Page<> mode */
  getPaged(page: number, size: number = 9): Observable<ApiEnvelope<PagedResponse<StartupResponse>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PagedResponse<StartupResponse>>>(`${this.api}/startup`, { params }).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  search(filters: { industry?: string; stage?: string; minFunding?: number; maxFunding?: number }): Observable<ApiEnvelope<StartupResponse[]>> {
    let params = new HttpParams();
    if (filters.industry)  params = params.set('industry', filters.industry);
    if (filters.stage)     params = params.set('stage', filters.stage);
    if (filters.minFunding != null) params = params.set('minFunding', filters.minFunding);
    if (filters.maxFunding != null) params = params.set('maxFunding', filters.maxFunding);
    return this.http.get<ApiResponse<StartupResponse[]>>(`${this.api}/startup/search`, { params }).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  /** Paginated filtered search — triggers backend Page<> mode */
  searchPaged(
    filters: { industry?: string; stage?: string; minFunding?: number; maxFunding?: number },
    page: number,
    size: number = 9
  ): Observable<ApiEnvelope<PagedResponse<StartupResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.industry)  params = params.set('industry', filters.industry);
    if (filters.stage)     params = params.set('stage', filters.stage);
    if (filters.minFunding != null) params = params.set('minFunding', filters.minFunding);
    if (filters.maxFunding != null) params = params.set('maxFunding', filters.maxFunding);
    return this.http.get<ApiResponse<PagedResponse<StartupResponse>>>(`${this.api}/startup/search`, { params }).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  getDetails(id: number): Observable<ApiEnvelope<StartupResponse>> {
    return this.http.get<ApiResponse<StartupResponse>>(`${this.api}/startup/details/${id}`).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  getMyStartups(): Observable<ApiEnvelope<StartupResponse[]>> {
    return this.http.get<ApiResponse<StartupResponse[]>>(`${this.api}/startup/founder`).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  create(req: StartupRequest): Observable<ApiEnvelope<StartupResponse>> {
    return this.http.post<ApiResponse<StartupResponse>>(`${this.api}/startup`, req).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  update(id: number, req: StartupRequest): Observable<ApiEnvelope<StartupResponse>> {
    return this.http.put<ApiResponse<StartupResponse>>(`${this.api}/startup/${id}`, req).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }

  delete(id: number): Observable<ApiEnvelope<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.api}/startup/${id}`).pipe(
      map(normalizeWrapped),
      catchError(err => throwError(() => normalizeError(err)))
    );
  }
}
