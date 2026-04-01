import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Investment } from '../../shared/models/investment.model';
import { InvestmentDto, InvestmentCreateDto } from '../../shared/models/investment.dto';
import { investmentMapper } from '../../shared/mappers/investment.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/investments';

  private mapEnvelope(envelope: ApiEnvelope<InvestmentDto>): ApiEnvelope<Investment> {
    if (envelope.success && envelope.data) {
      return { ...envelope, data: investmentMapper.toDomain(envelope.data) };
    }
    return envelope as unknown as ApiEnvelope<Investment>;
  }

  private mapArrayEnvelope(envelope: ApiEnvelope<InvestmentDto[]>): ApiEnvelope<Investment[]> {
    if (envelope.success && envelope.data) {
      return { ...envelope, data: envelope.data.map(dto => investmentMapper.toDomain(dto)) };
    }
    return envelope as unknown as ApiEnvelope<Investment[]>;
  }

  createInvestment(data: InvestmentCreateDto): Observable<ApiEnvelope<Investment>> {
    return this.apiClient.post<InvestmentDto>(this.baseUrl, data).pipe(
      map(this.mapEnvelope)
    );
  }

  getInvestorInvestments(): Observable<ApiEnvelope<Investment[]>> {
    return this.apiClient.get<InvestmentDto[]>(`${this.baseUrl}/investor`).pipe(
      map(this.mapArrayEnvelope)
    );
  }

  getInvestmentById(id: number): Observable<ApiEnvelope<Investment>> {
    return this.apiClient.get<InvestmentDto>(`${this.baseUrl}/${id}`).pipe(
      map(this.mapEnvelope)
    );
  }

  getStartupInvestments(startupId: number): Observable<ApiEnvelope<Investment[]>> {
    return this.apiClient.get<InvestmentDto[]>(`${this.baseUrl}/startup/${startupId}`).pipe(
      map(this.mapArrayEnvelope)
    );
  }

  updateStatus(id: number, status: string): Observable<ApiEnvelope<Investment>> {
    return this.apiClient.put<InvestmentDto>(`${this.baseUrl}/${id}/status`, null, { params: { status } }).pipe(
      map(this.mapEnvelope)
    );
  }
}
