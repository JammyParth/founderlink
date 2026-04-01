import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Payment } from '../../shared/models/payment.model';
import { PaymentDto, RazorpayOrderResponse, PaymentConfirmDto } from '../../shared/models/payment.dto';
import { paymentMapper } from '../../shared/mappers/payment.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/payments';

  private mapEnvelope(envelope: ApiEnvelope<PaymentDto>): ApiEnvelope<Payment> {
    if (envelope.success && envelope.data) {
      return { ...envelope, data: paymentMapper.toDomain(envelope.data) };
    }
    return envelope as unknown as ApiEnvelope<Payment>;
  }

  getPaymentByInvestment(investmentId: number): Observable<ApiEnvelope<Payment>> {
    return this.apiClient.get<PaymentDto>(`${this.baseUrl}/investment/${investmentId}`).pipe(
      map(this.mapEnvelope)
    );
  }

  createOrder(investmentId: number): Observable<ApiEnvelope<RazorpayOrderResponse>> {
    return this.apiClient.post<RazorpayOrderResponse>(`${this.baseUrl}/create-order`, { investmentId });
  }

  confirmPayment(dto: PaymentConfirmDto): Observable<ApiEnvelope<Payment>> {
    return this.apiClient.post<PaymentDto>(`${this.baseUrl}/confirm`, dto).pipe(
      map(this.mapEnvelope)
    );
  }

  getPaymentById(id: number): Observable<ApiEnvelope<Payment>> {
    return this.apiClient.get<PaymentDto>(`${this.baseUrl}/${id}`).pipe(
      map(this.mapEnvelope)
    );
  }
}
