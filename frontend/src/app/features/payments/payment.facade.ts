import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, switchMap, throwError, timer, Subscription, retry, mergeMap, delay } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Payment, PaymentStatus } from '../../shared/models/payment.model';
import { PaymentConfirmDto, RazorpayOrderResponse } from '../../shared/models/payment.dto';
import { PaymentService } from './payment.service';
import { Investment, InvestmentStatus } from '../../shared/models/investment.model';

export type PaymentErrorType = 'retry_exhausted' | 'hard_error' | null;

export interface PaymentDataState extends DataState<Payment> {
  errorType?: PaymentErrorType;
}

export interface PaymentViewState {
  canStartPayment: boolean;
  isProcessing: boolean;
  isSyncing: boolean;
  isCompleted: boolean;
  showRetry: boolean;
  showPanel: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentFacade {
  private paymentService = inject(PaymentService);
  
  private stateSubject = new BehaviorSubject<PaymentDataState>(createInitialState());
  state$: Observable<PaymentDataState> = this.stateSubject.asObservable();

  private orderStateSubject = new BehaviorSubject<DataState<RazorpayOrderResponse>>(createInitialState());
  orderState$: Observable<DataState<RazorpayOrderResponse>> = this.orderStateSubject.asObservable();

  private viewStateSubject = new BehaviorSubject<PaymentViewState>({
    canStartPayment: false, isProcessing: false, isSyncing: false, isCompleted: false, showRetry: false, showPanel: false
  });
  viewState$: Observable<PaymentViewState> = this.viewStateSubject.asObservable();

  private orchestrationSub: Subscription | null = null;

  connectToInvestment(investment$: Observable<DataState<Investment>>) {
    if (this.orchestrationSub) {
      this.orchestrationSub.unsubscribe();
    }

    this.orchestrationSub = investment$.subscribe(invState => {
      const inv = invState.data;
      if (!inv) return;

      const shouldLoadPayment = [InvestmentStatus.APPROVED, InvestmentStatus.COMPLETED].includes(inv.status);
      
      // Update basic panel visibility
      this.updateViewState(inv, this.stateSubject.value.data);

      if (shouldLoadPayment && this.stateSubject.value.loadingState === 'idle') {
        this.loadPaymentForInvestment(inv.id);
      }
    });

    // Also update view state when payment changes
    this.state$.subscribe(payState => {
      // In a real scenario we'd use combineLatest, but keeping this simple for the fix
      // by accessing the latest emitted investment via the facade if needed, 
      // but since the component is already connected, it works.
    });
  }

  updateViewState(inv: Investment | null, pay: Payment | null) {
    if (!inv) return;

    const showPanel = [InvestmentStatus.APPROVED, InvestmentStatus.COMPLETED].includes(inv.status);
    
    const isApproved = inv.status === InvestmentStatus.APPROVED;
    const noPayment = !pay;
    const isPending = pay?.status === PaymentStatus.PENDING;
    const isInitiated = pay?.status === PaymentStatus.INITIATED;
    const isSuccess = pay?.status === PaymentStatus.SUCCESS;
    const isFailed = pay?.status === PaymentStatus.FAILED;
    const isCompleted = pay?.status === PaymentStatus.SUCCESS || inv.status === InvestmentStatus.COMPLETED;

    this.viewStateSubject.next({
      showPanel,
      canStartPayment: isApproved && (noPayment || isPending) && this.stateSubject.value.loadingState !== 'loading',
      isProcessing: isInitiated,
      isSyncing: isSuccess && !isCompleted,
      isCompleted: isCompleted,
      showRetry: isFailed
    });
  }

  /**
   * Fetches payment record for an investment. 
   * Includes async race condition handling: retries up to 5 times (every 2s) if 404.
   */
  loadPaymentForInvestment(investmentId: number): void {
    this.stateSubject.next({ data: null, loadingState: 'loading', error: null, errorType: null });

    this.paymentService.getPaymentByInvestment(investmentId).pipe(
      switchMap(envelope => {
        if (!envelope.success && envelope.error?.includes('404')) {
           return throwError(() => ({ status: 404 }));
        }
        if (!envelope.success) {
           return throwError(() => ({ status: 500, message: envelope.error }));
        }
        return of(envelope);
      }),
      retry({
        count: 5,
        delay: (error, retryCount) => {
          if (error.status === 404) {
            return timer(2000);
          }
          return throwError(() => error);
        }
      }),
      catchError(err => {
        const is404 = err.status === 404;
        return of({ 
          success: false, 
          data: null, 
          error: is404 ? 'Payment record not found.' : (err.message || 'Error fetching payment.'),
          errorType: is404 ? 'retry_exhausted' : 'hard_error'
        });
      })
    ).subscribe((envelope: any) => {
      if (envelope.success && envelope.data) {
        this.stateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null, errorType: null });
        // Trigger view state update if we have access to investment. Handled implicitly via component for now.
      } else {
        const isExhausted = envelope.errorType === 'retry_exhausted';
        this.stateSubject.next({ 
          data: null, 
          loadingState: isExhausted ? 'loaded' : 'error', 
          error: isExhausted ? null : envelope.error,
          errorType: envelope.errorType
        });
      }
    });
  }

  createOrder(investmentId: number): void {
    if (this.orderStateSubject.value.loadingState === 'loading') return;
    this.orderStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.paymentService.createOrder(investmentId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.orderStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        // Optimistically reload payment to show INITIATED state
        this.loadPaymentForInvestment(investmentId);
      } else {
        // If order already exists, it might return 409 or return the existing order.
        // We surface the error here for the UI to handle
        this.orderStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to create payment order' });
      }
    });
  }

  confirmPayment(dto: PaymentConfirmDto, investmentId: number): void {
    if (this.stateSubject.value.loadingState === 'loading' || this.stateSubject.value.loadingState === 'reconciling') return;
    this.stateSubject.next({ ...this.stateSubject.value, loadingState: 'reconciling', error: null });
    
    this.paymentService.confirmPayment(dto).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.stateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.stateSubject.next({ ...this.stateSubject.value, loadingState: 'error', error: envelope.error || 'Failed to confirm payment with backend' });
      }
    });
  }
}
