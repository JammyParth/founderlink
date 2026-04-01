import { Payment, parsePaymentStatus } from '../models/payment.model';
import { PaymentDto } from '../models/payment.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class PaymentMapper implements Mapper<Payment, PaymentDto> {
  toDomain(dto: PaymentDto): Payment {
    return {
      id: dto.id,
      investmentId: dto.investmentId,
      amount: dto.amount,
      currency: dto.currency,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      status: parsePaymentStatus(dto.status),
      createdAt: DateAdapter.fromServer(dto.createdAt)
    };
  }
}

export const paymentMapper = new PaymentMapper();
