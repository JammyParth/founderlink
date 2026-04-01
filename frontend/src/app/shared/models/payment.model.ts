export enum PaymentStatus {
  PENDING = 'PENDING',
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export function parsePaymentStatus(status: string | null | undefined): PaymentStatus {
  if (!status) return PaymentStatus.PENDING;
  const upperStatus = status.toUpperCase();
  
  if (Object.values(PaymentStatus).includes(upperStatus as PaymentStatus)) {
    return upperStatus as PaymentStatus;
  }
  
  return PaymentStatus.PENDING;
}

export interface Payment {
  id: number;
  investmentId: number;
  amount: number;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  status: PaymentStatus;
  createdAt: Date | null;
}
