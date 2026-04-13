import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PaymentsComponent } from './payments';
import { AuthService } from '../../core/services/auth.service';
import { InvestmentService } from '../../core/services/investment.service';
import { PaymentService } from '../../core/services/payment.service';
import { StartupService } from '../../core/services/startup.service';

const mockInvApproved = { id: 1, startupId: 1, investorId: 20, amount: 10000, status: 'APPROVED' } as any;
const mockInvCompleted = { id: 2, startupId: 1, investorId: 20, amount: 5000, status: 'COMPLETED' } as any;
const mockPayment = { id: 100, investmentId: 1, status: 'PENDING', razorpayOrderId: 'order_X' } as any;
const mockOrder = { orderId: 'order_XYZ', amount: 1000000, currency: 'INR' } as any;

describe('PaymentsComponent', () => {
  let fixture: ComponentFixture<PaymentsComponent>;
  let component: PaymentsComponent;
  let authStub: Partial<AuthService>;
  let investStub: Partial<InvestmentService>;
  let paymentStub: Partial<PaymentService>;
  let startupStub: Partial<StartupService>;

  beforeEach(async () => {
    authStub = {
      userId: vi.fn().mockReturnValue(20) as any,
      email: vi.fn().mockReturnValue('test@user.com') as any
    };
    investStub = {
      getMyPortfolio: vi.fn().mockReturnValue(
        of({ success: true, data: [mockInvApproved, mockInvCompleted], error: null })
      )
    };
    paymentStub = {
      getPaymentByInvestment: vi.fn().mockReturnValue(of({ success: true, data: mockPayment, error: null })),
      createOrder: vi.fn().mockReturnValue(of({ success: true, data: mockOrder, error: null })),
      pollPaymentAvailability: vi.fn().mockReturnValue(of({ success: true, data: mockPayment, error: null }))
    };
    startupStub = {
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [], error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: InvestmentService, useValue: investStub },
        { provide: PaymentService, useValue: paymentStub },
        { provide: StartupService, useValue: startupStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── loadPortfolio ────────────────────────────────────────────────────────

  describe('loadPortfolio()', () => {
    it('Normal: should filter portfolio to only APPROVED/COMPLETED/PAYMENT_FAILED investments', () => {
      // APPROVED + COMPLETED → both pass the filter
      expect(component.items()).toHaveLength(2);
    });

    it('Boundary: should fetch payment record for each filtered investment', () => {
      expect(paymentStub.getPaymentByInvestment).toHaveBeenCalledWith(1); // APPROVED
      expect(paymentStub.getPaymentByInvestment).toHaveBeenCalledWith(2); // COMPLETED
    });

    it('Exception: should set errorMsg when getMyPortfolio fails', async () => {
      investStub.getMyPortfolio = vi.fn().mockReturnValue(throwError(() => ({ error: 'Portfolio unavailable' })));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PaymentsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: PaymentService, useValue: paymentStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PaymentsComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Portfolio unavailable');
    });
  });

  // ─── startPayment() ───────────────────────────────────────────────────────

  describe('startPayment()', () => {
    it('Normal: should call paymentService.createOrder when startPayment is triggered', () => {
      const item = component.items()[0];
      component.startPayment(item);
      expect(paymentStub.createOrder).toHaveBeenCalledWith({ investmentId: 1 });
    });

    it('Boundary: should not call createOrder when processingId is already set', () => {
      component.processingId = 1;
      const item = component.items()[0];
      component.startPayment(item);
      expect(paymentStub.createOrder).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when createOrder fails', () => {
      paymentStub.createOrder = vi.fn().mockReturnValue(throwError(() => ({ error: 'Order creation failed' })));
      const item = component.items()[0];
      component.startPayment(item);
      expect(component.errorMsg()).toBe('Order creation failed');
      expect(component.processingId).toBeNull();
    });
  });

  // ─── canPay() ─────────────────────────────────────────────────────────────

  describe('canPay()', () => {
    it('Normal: should return true for APPROVED investment with PENDING payment', () => {
      const item = { investment: mockInvApproved, payment: mockPayment, paymentLoading: false, paymentError: '' };
      expect(component.canPay(item)).toBe(true);
    });

    it('Boundary: should return false when processingId is not null (another payment in progress)', () => {
      component.processingId = 99;
      const item = { investment: mockInvApproved, payment: mockPayment, paymentLoading: false, paymentError: '' };
      expect(component.canPay(item)).toBe(false);
    });

    it('Exception: should return false for COMPLETED investment (already paid)', () => {
      const item = {
        investment: mockInvCompleted,
        payment: { ...mockPayment, status: 'SUCCESS' },
        paymentLoading: false,
        paymentError: ''
      };
      expect(component.canPay(item)).toBe(false);
    });
  });

  // ─── payButtonLabel() ─────────────────────────────────────────────────────

  describe('payButtonLabel()', () => {
    it('Normal: should return "Pay Now" for PENDING payment', () => {
      const item = { investment: mockInvApproved, payment: mockPayment, paymentLoading: false, paymentError: '' };
      expect(component.payButtonLabel(item)).toBe('Pay Now');
    });

    it('Boundary: should return "Resume Payment" for INITIATED payment', () => {
      const item = {
        investment: mockInvApproved,
        payment: { ...mockPayment, status: 'INITIATED' },
        paymentLoading: false,
        paymentError: ''
      };
      expect(component.payButtonLabel(item)).toBe('Resume Payment');
    });

    it('Exception: should return "Retry Payment" for FAILED payment', () => {
      const item = {
        investment: mockInvApproved,
        payment: { ...mockPayment, status: 'FAILED' },
        paymentLoading: false,
        paymentError: ''
      };
      expect(component.payButtonLabel(item)).toBe('Retry Payment');
    });
  });

  // ─── fetchPayment() error paths ───────────────────────────────────────────

  describe('fetchPayment() error paths', () => {
    it('Normal: should call pollPayment when APPROVED investment has no payment record', () => {
      paymentStub.getPaymentByInvestment = vi.fn().mockReturnValue(
        throwError(() => new Error('not found'))
      );
      paymentStub.pollPaymentAvailability = vi.fn().mockReturnValue(
        of({ success: true, data: mockPayment, error: null })
      );
      component.items.set([
        { investment: mockInvApproved, payment: null, paymentLoading: true, paymentError: '' }
      ]);
      component.fetchPayment(mockInvApproved, 0);
      expect(paymentStub.pollPaymentAvailability).toHaveBeenCalledWith(1);
    });

    it('Boundary: should set paymentError when non-APPROVED investment has no payment record', () => {
      paymentStub.getPaymentByInvestment = vi.fn().mockReturnValue(
        throwError(() => new Error('not found'))
      );
      component.items.set([
        { investment: mockInvCompleted, payment: null, paymentLoading: true, paymentError: '' }
      ]);
      component.fetchPayment(mockInvCompleted, 0);
      expect(component.items()[0].paymentError).toContain('not found');
    });

    it('Exception: fetchPayment should update payment data on success', () => {
      component.items.set([
        { investment: mockInvApproved, payment: null, paymentLoading: true, paymentError: '' }
      ]);
      component.fetchPayment(mockInvApproved, 0);
      expect(component.items()[0].payment).toEqual(mockPayment);
      expect(component.items()[0].paymentLoading).toBe(false);
    });
  });

  // ─── pollPayment() ────────────────────────────────────────────────────────

  describe('pollPayment()', () => {
    it('Normal: should update payment data on successful poll', () => {
      component.items.set([
        { investment: mockInvApproved, payment: null, paymentLoading: true, paymentError: '' }
      ]);
      component.pollPayment(mockInvApproved, 0);
      expect(component.items()[0].payment).toEqual(mockPayment);
      expect(component.items()[0].paymentLoading).toBe(false);
    });

    it('Exception: should set paymentError when poll fails', () => {
      paymentStub.pollPaymentAvailability = vi.fn().mockReturnValue(
        throwError(() => new Error('timeout'))
      );
      component.items.set([
        { investment: mockInvApproved, payment: null, paymentLoading: true, paymentError: '' }
      ]);
      component.pollPayment(mockInvApproved, 0);
      expect(component.items()[0].paymentError).toContain('longer than expected');
      expect(component.items()[0].paymentLoading).toBe(false);
    });
  });

  // ─── paymentStatusClass() / paymentStatusLabel() ──────────────────────────

  describe('paymentStatusClass() / paymentStatusLabel()', () => {
    it('Normal: statusClass should return badge-success for SUCCESS', () => {
      expect(component.paymentStatusClass('SUCCESS' as any)).toBe('badge-success');
    });

    it('Boundary: statusClass should return correct class for each status', () => {
      expect(component.paymentStatusClass('INITIATED' as any)).toBe('badge-info');
      expect(component.paymentStatusClass('PENDING' as any)).toBe('badge-warning');
      expect(component.paymentStatusClass('FAILED' as any)).toBe('badge-danger');
    });

    it('Exception: statusClass should return badge-gray when status is undefined', () => {
      expect(component.paymentStatusClass(undefined)).toBe('badge-gray');
    });

    it('Normal: statusLabel should return "Paid" for SUCCESS', () => {
      expect(component.paymentStatusLabel('SUCCESS' as any)).toBe('Paid');
    });

    it('Boundary: statusLabel should return correct labels for each status', () => {
      expect(component.paymentStatusLabel('PENDING' as any)).toBe('Ready for Payment');
      expect(component.paymentStatusLabel('INITIATED' as any)).toBe('Checkout Started');
      expect(component.paymentStatusLabel('FAILED' as any)).toBe('Payment Failed');
    });

    it('Exception: statusLabel should return "Awaiting" when status is undefined', () => {
      expect(component.paymentStatusLabel(undefined)).toBe('Awaiting');
    });
  });

  // ─── formatCurrency() ────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format amount as INR currency string', () => {
      const result = component.formatCurrency(10000);
      expect(result).toContain('10,000');
    });

    it('Boundary: should format 0 correctly', () => {
      const result = component.formatCurrency(0);
      expect(result).toContain('0');
    });
  });

  // ─── loadPortfolio() with only PENDING status investment ──────────────────

  describe('loadPortfolio() filter edge cases', () => {
    it('Boundary: should not include PENDING investments in items list', async () => {
      const pendingInv = { id: 3, startupId: 1, investorId: 20, amount: 1000, status: 'PENDING' } as any;
      investStub.getMyPortfolio = vi.fn().mockReturnValue(
        of({ success: true, data: [pendingInv], error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PaymentsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: PaymentService, useValue: paymentStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PaymentsComponent);
      f.detectChanges();
      expect(f.componentInstance.items()).toHaveLength(0);
    });
  });

  // ─── startupService.getAll() with non-empty data ──────────────────────────

  describe('startupService.getAll() with non-empty data', () => {
    it('Normal: should build startupNames map from startup list', async () => {
      const mockStartup = { id: 1, name: 'TechCo' } as any;
      startupStub.getAll = vi.fn().mockReturnValue(
        of({ success: true, data: [mockStartup], error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PaymentsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: PaymentService, useValue: paymentStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PaymentsComponent);
      f.detectChanges();
      expect(f.componentInstance.startupNames().get(1)).toBe('TechCo');
    });
  });

  // ─── openRazorpay() with Razorpay SDK available ───────────────────────────

  describe('openRazorpay() — Razorpay available', () => {
    afterEach(() => {
      delete (globalThis as any).Razorpay;
    });

    it('Normal: should instantiate Razorpay and call open() when SDK is loaded', () => {
      const mockOpen = vi.fn();
      // Must be a regular function (not arrow) to work with `new`
      (globalThis as any).Razorpay = function(opts: any) { return { open: mockOpen }; };
      const item = component.items()[0]; // APPROVED with PENDING payment
      component.startPayment(item);
      expect(mockOpen).toHaveBeenCalled();
    });

    it('Boundary: should pass correct key and order_id to Razorpay constructor', () => {
      let capturedOptions: any;
      (globalThis as any).Razorpay = function(opts: any) {
        capturedOptions = opts;
        return { open: vi.fn() };
      };
      const item = component.items()[0];
      component.startPayment(item);
      expect(capturedOptions.order_id).toBe('order_XYZ');
      expect(capturedOptions.currency).toBe('INR');
    });

    it('Boundary: should set prefill email from authService', () => {
      let capturedOptions: any;
      (globalThis as any).Razorpay = function(opts: any) {
        capturedOptions = opts;
        return { open: vi.fn() };
      };
      const item = component.items()[0];
      component.startPayment(item);
      expect(capturedOptions.prefill.email).toBe('test@user.com');
    });
  });

  // ─── confirmPayment() via Razorpay handler ────────────────────────────────

  describe('confirmPayment() via Razorpay handler', () => {
    afterEach(() => {
      delete (globalThis as any).Razorpay;
      vi.useRealTimers();
    });

    const setupRazorpay = () => {
      let capturedHandler: (response: any) => void = () => {};
      // Regular function required — arrow functions cannot be used with `new`
      (globalThis as any).Razorpay = function(opts: any) {
        capturedHandler = opts.handler;
        return { open: vi.fn() };
      };
      return () => capturedHandler;
    };

    it('Normal: should call confirmPayment service and set successMsg on success', () => {
      const getHandler = setupRazorpay();
      (paymentStub as any).confirmPayment = vi.fn().mockReturnValue(
        of({ success: true, data: null, error: null })
      );
      const item = component.items()[0];
      component.startPayment(item);
      const handler = getHandler();
      handler({ razorpay_order_id: 'order_XYZ', razorpay_payment_id: 'pay_ABC', razorpay_signature: 'sig' });
      expect((paymentStub as any).confirmPayment).toHaveBeenCalledWith({
        razorpayOrderId:   'order_XYZ',
        razorpayPaymentId: 'pay_ABC',
        razorpaySignature: 'sig'
      });
      expect(component.successMsg()).toContain('Payment confirmed');
    });

    it('Boundary: should reload portfolio after 2s timeout on confirm success', () => {
      vi.useFakeTimers();
      const getHandler = setupRazorpay();
      (paymentStub as any).confirmPayment = vi.fn().mockReturnValue(
        of({ success: true, data: null, error: null })
      );
      const item = component.items()[0];
      component.startPayment(item);
      const handler = getHandler();
      handler({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' });
      const callsBefore = (investStub.getMyPortfolio as any).mock.calls.length;
      vi.advanceTimersByTime(2000);
      expect((investStub.getMyPortfolio as any).mock.calls.length).toBeGreaterThan(callsBefore);
      vi.useRealTimers();
    });

    it('Exception: should set errorMsg when confirmPayment service fails', () => {
      const getHandler = setupRazorpay();
      (paymentStub as any).confirmPayment = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Signature mismatch' }))
      );
      const item = component.items()[0];
      component.startPayment(item);
      const handler = getHandler();
      handler({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' });
      expect(component.errorMsg()).toBe('Signature mismatch');
    });

    it('Exception: should use fallback message when confirmPayment error has no error property', () => {
      const getHandler = setupRazorpay();
      (paymentStub as any).confirmPayment = vi.fn().mockReturnValue(
        throwError(() => ({}))
      );
      const item = component.items()[0];
      component.startPayment(item);
      const handler = getHandler();
      handler({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' });
      expect(component.errorMsg()).toBe('Payment confirmation failed.');
    });
  });

  // ─── canPay() extra branches ──────────────────────────────────────────────

  describe('canPay() extra branches', () => {
    it('Normal: canPay returns true for INITIATED payment status', () => {
      const item = {
        investment: mockInvApproved,
        payment: { ...mockPayment, status: 'INITIATED' },
        paymentLoading: false, paymentError: ''
      };
      expect(component.canPay(item)).toBe(true);
    });

    it('Boundary: canPay returns true for FAILED payment status on APPROVED investment', () => {
      const item = {
        investment: mockInvApproved,
        payment: { ...mockPayment, status: 'FAILED' },
        paymentLoading: false, paymentError: ''
      };
      expect(component.canPay(item)).toBe(true);
    });

    it('Exception: canPay returns false when payment status is SUCCESS', () => {
      const item = {
        investment: mockInvApproved,
        payment: { ...mockPayment, status: 'SUCCESS' },
        paymentLoading: false, paymentError: ''
      };
      expect(component.canPay(item)).toBe(false);
    });
  });

  // ─── startPayment() error without error property ──────────────────────────

  describe('startPayment() fallback error', () => {
    it('Exception: should use fallback message when createOrder error has no error property', () => {
      paymentStub.createOrder = vi.fn().mockReturnValue(throwError(() => ({})));
      const item = component.items()[0];
      component.startPayment(item);
      expect(component.errorMsg()).toBe('Failed to create payment order.');
      expect(component.processingId).toBeNull();
    });
  });
});
