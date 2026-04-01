export interface PaymentDto {
  id: number;
  investmentId: number;
  amount: number;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  status: string;
  createdAt: string | null;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  investmentId: number;
}

export interface PaymentConfirmDto {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
