import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';
import {
  CreateOrderRequest, CreateOrderResponse,
  ConfirmPaymentRequest, ConfirmPaymentResponse,
  PaymentResponse
} from '../../models';

const API = environment.apiUrl;

const mockPayment: PaymentResponse = {
  id: 500,
  investmentId: 100,
  investorId: 20,
  startupId: 1,
  founderId: 10,
  amount: 25000,
  status: 'PENDING',
  razorpayOrderId: 'order_ABC123',
  razorpayPaymentId: null,
  walletCredited: false,
  createdAt: '2025-06-01T10:00:00',
  updatedAt: null
} as any;

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService]
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── createOrder() ────────────────────────────────────────────────────────

  describe('createOrder()', () => {
    const req: CreateOrderRequest = { investmentId: 100 } as any;

    it('Normal: should POST /payments/create-order and return order envelope', () => {
      const orderRes: CreateOrderResponse = { orderId: 'order_ABC', amount: 25000, currency: 'INR' } as any;
      service.createOrder(req).subscribe(res => {
        expect(res.success).toBe(true);
        expect((res.data as any).orderId).toBe('order_ABC');
      });
      const http = httpMock.expectOne(`${API}/payments/create-order`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Order created', data: orderRes });
    });

    it('Boundary: should create order with amount equal to minimum investment (1)', () => {
      const minReq: CreateOrderRequest = { investmentId: 1 } as any;
      const orderRes = { orderId: 'order_MIN', amount: 1, currency: 'INR' };
      service.createOrder(minReq).subscribe(res => {
        expect((res.data as any).amount).toBe(1);
      });
      httpMock.expectOne(`${API}/payments/create-order`).flush({ message: 'ok', data: orderRes });
    });

    it('Exception: should return normalised error on HTTP 409 when order already exists', () => {
      let errorEnv: any;
      service.createOrder(req).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/payments/create-order`).flush(
        { message: 'Payment order already exists for this investment' },
        { status: 409, statusText: 'Conflict' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── confirmPayment() ─────────────────────────────────────────────────────

  describe('confirmPayment()', () => {
    const req: ConfirmPaymentRequest = {
      razorpayOrderId: 'order_ABC',
      razorpayPaymentId: 'pay_XYZ',
      razorpaySignature: 'sig_123',
      investmentId: 100
    } as any;

    it('Normal: should POST /payments/confirm and return confirmed payment envelope', () => {
      const confirmRes: ConfirmPaymentResponse = { message: 'Payment confirmed', paymentId: 500 } as any;
      service.confirmPayment(req).subscribe(res => {
        expect(res.success).toBe(true);
        expect((res.data as any).paymentId).toBe(500);
      });
      const http = httpMock.expectOne(`${API}/payments/confirm`);
      expect(http.request.method).toBe('POST');
      http.flush({ message: 'Confirmed', data: confirmRes });
    });

    it('Boundary: should send request body with all 4 required Razorpay fields', () => {
      service.confirmPayment(req).subscribe();
      const http = httpMock.expectOne(`${API}/payments/confirm`);
      expect(http.request.body.razorpayOrderId).toBe('order_ABC');
      expect(http.request.body.razorpayPaymentId).toBe('pay_XYZ');
      expect(http.request.body.razorpaySignature).toBe('sig_123');
      expect(http.request.body.investmentId).toBe(100);
      http.flush({ message: 'ok', data: {} });
    });

    it('Exception: should return normalised error on HTTP 400 invalid signature', () => {
      let errorEnv: any;
      service.confirmPayment(req).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/payments/confirm`).flush(
        { message: 'Signature verification failed' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getPayment() ─────────────────────────────────────────────────────────

  describe('getPayment()', () => {
    it('Normal: should GET /payments/{paymentId} and return payment envelope', () => {
      service.getPayment(500).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.id).toBe(500);
        expect(res.data?.status).toBe('PENDING');
      });
      const http = httpMock.expectOne(`${API}/payments/500`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: mockPayment });
    });

    it('Boundary: should get payment with id = 1', () => {
      service.getPayment(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      httpMock.expectOne(`${API}/payments/1`).flush({ message: 'ok', data: { ...mockPayment, id: 1 } });
    });

    it('Exception: should return normalised error on HTTP 404', () => {
      let errorEnv: any;
      service.getPayment(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/payments/9999`).flush(
        { message: 'Payment not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getPaymentByInvestment() ─────────────────────────────────────────────

  describe('getPaymentByInvestment()', () => {
    it('Normal: should GET /payments/investment/{id} and return payment envelope', () => {
      service.getPaymentByInvestment(100).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.investmentId).toBe(100);
      });
      const http = httpMock.expectOne(`${API}/payments/investment/100`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: mockPayment });
    });

    it('Boundary: should request payment for investment id = 1', () => {
      service.getPaymentByInvestment(1).subscribe(res => {
        expect(res.success).toBe(true);
      });
      httpMock.expectOne(`${API}/payments/investment/1`).flush({ message: 'ok', data: { ...mockPayment, investmentId: 1 } });
    });

    it('Exception: should return normalised error on HTTP 404 (payment not created yet)', () => {
      let errorEnv: any;
      service.getPaymentByInvestment(999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/payments/investment/999`).flush(
        { message: 'Payment not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── pollPaymentAvailability() ────────────────────────────────────────────

  describe('pollPaymentAvailability()', () => {
    it('Normal: should resolve immediately when payment exists on first attempt', () => {
      let emitted: any;
      service.pollPaymentAvailability(100).subscribe(res => (emitted = res));
      httpMock.expectOne(`${API}/payments/investment/100`).flush({ message: 'ok', data: mockPayment });
      expect(emitted.success).toBe(true);
      expect(emitted.data?.id).toBe(500);
    });

    it('Boundary: should retry on 404 and resolve when payment becomes available', () => {
      vi.useFakeTimers();
      let emitted: any;
      service.pollPaymentAvailability(100).subscribe(res => (emitted = res));

      // First attempt → 404 (not yet available)
      httpMock.expectOne(`${API}/payments/investment/100`).flush(
        { message: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );

      // Advance past the 2000ms poll interval
      vi.advanceTimersByTime(2000);

      // Second attempt → success
      httpMock.expectOne(`${API}/payments/investment/100`).flush({ message: 'ok', data: mockPayment });
      expect(emitted.success).toBe(true);
      vi.useRealTimers();
    });

    it('Exception: should stop polling and throw error on non-404 HTTP error (403)', () => {
      let errorEnv: any;
      service.pollPaymentAvailability(100).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/payments/investment/100`).flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });
});
