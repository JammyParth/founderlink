import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Startup } from '../../shared/models/startup.model';
import { StartupDto, StartupCreateDto } from '../../shared/models/startup.dto';
import { startupMapper } from '../../shared/mappers/startup.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StartupService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/startup';

  private mapEnvelope(envelope: ApiEnvelope<StartupDto>): ApiEnvelope<Startup> {
    if (envelope.success && envelope.data) {
      return { ...envelope, data: startupMapper.toDomain(envelope.data) };
    }
    return envelope as unknown as ApiEnvelope<Startup>;
  }

  private mapArrayEnvelope(envelope: ApiEnvelope<StartupDto[]>): ApiEnvelope<Startup[]> {
    if (envelope.success && envelope.data) {
      return { ...envelope, data: envelope.data.map(dto => startupMapper.toDomain(dto)) };
    }
    return envelope as unknown as ApiEnvelope<Startup[]>;
  }

  getAll(): Observable<ApiEnvelope<Startup[]>> {
    return this.apiClient.get<StartupDto[]>(this.baseUrl).pipe(
      map(this.mapArrayEnvelope)
    );
  }

  search(filters: { industry?: string, stage?: string, minFunding?: number, maxFunding?: number }): Observable<ApiEnvelope<Startup[]>> {
    let params = new HttpParams();
    if (filters.industry) params = params.set('industry', filters.industry);
    if (filters.stage) params = params.set('stage', filters.stage);
    if (filters.minFunding !== undefined) params = params.set('minFunding', filters.minFunding.toString());
    if (filters.maxFunding !== undefined) params = params.set('maxFunding', filters.maxFunding.toString());

    return this.apiClient.get<StartupDto[]>(`${this.baseUrl}/search`, { params }).pipe(
      map(this.mapArrayEnvelope)
    );
  }

  getById(id: number): Observable<ApiEnvelope<Startup>> {
    return this.apiClient.get<StartupDto>(`${this.baseUrl}/details/${id}`).pipe(
      map(this.mapEnvelope)
    );
  }

  getFounderStartups(): Observable<ApiEnvelope<Startup[]>> {
    return this.apiClient.get<StartupDto[]>(`${this.baseUrl}/founder`).pipe(
      map(this.mapArrayEnvelope)
    );
  }

  create(data: StartupCreateDto): Observable<ApiEnvelope<Startup>> {
    return this.apiClient.post<StartupDto>(this.baseUrl, data).pipe(
      map(this.mapEnvelope)
    );
  }

  update(id: number, data: StartupCreateDto): Observable<ApiEnvelope<Startup>> {
    return this.apiClient.put<StartupDto>(`${this.baseUrl}/${id}`, data).pipe(
      map(this.mapEnvelope)
    );
  }

  delete(id: number): Observable<ApiEnvelope<void>> {
    return this.apiClient.delete<void>(`${this.baseUrl}/${id}`);
  }
}
