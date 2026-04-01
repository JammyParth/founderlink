import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Payment, PaymentStatus } from '../../../shared/models/payment.model';
import { PaymentViewState } from '../../payments/payment.facade';

@Component({
  selector: 'app-payment-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-bold text-gray-900">Payment Status</h3>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="getStatusClasses()">
          {{ payment ? payment.status : 'PENDING_INITIATION' }}
        </span>
      </div>

      <div class="p-6">
        <ng-container *ngIf="payment; else noPayment">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p class="text-sm text-gray-500 font-medium">Amount</p>
              <p class="text-lg font-semibold text-gray-900">{{ payment.amount | currency:payment.currency:'symbol':'1.0-0' }}</p>
            </div>
            <div *ngIf="payment.razorpayOrderId">
              <p class="text-sm text-gray-500 font-medium">Order ID</p>
              <p class="text-sm font-mono text-gray-900 break-all">{{ payment.razorpayOrderId }}</p>
            </div>
            <div *ngIf="payment.razorpayPaymentId">
              <p class="text-sm text-gray-500 font-medium">Transaction ID</p>
              <p class="text-sm font-mono text-gray-900 break-all">{{ payment.razorpayPaymentId }}</p>
            </div>
          </div>

          <div class="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <ng-container *ngIf="viewState?.isProcessing">
              <button (click)="onResume.emit()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded shadow-sm transition-colors w-full sm:w-auto">
                Resume Payment
              </button>
            </ng-container>
            <ng-container *ngIf="viewState?.showRetry">
              <button (click)="onRetry.emit()" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded shadow-sm transition-colors w-full sm:w-auto">
                Retry Payment
              </button>
            </ng-container>
            <ng-container *ngIf="viewState?.isSyncing">
              <div class="flex items-center text-blue-600 font-medium">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing completion status...
              </div>
            </ng-container>
            <ng-container *ngIf="viewState?.canStartPayment">
              <button (click)="onInitiate.emit()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded shadow-sm transition-colors w-full sm:w-auto">
                Pay Now
              </button>
            </ng-container>
          </div>
        </ng-container>

        <ng-template #noPayment>
          <div class="text-center py-6">
            <p class="text-gray-600 mb-4">Investment is approved. You can now initiate the payment transfer securely.</p>
            <button (click)="onInitiate.emit()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded shadow-sm transition-colors w-full sm:w-auto">
              Start Payment Transfer
            </button>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class PaymentPanelComponent {
  @Input() payment: Payment | null = null;
  @Input() viewState: PaymentViewState | null = null;
  
  @Output() onInitiate = new EventEmitter<void>();
  @Output() onResume = new EventEmitter<void>();
  @Output() onRetry = new EventEmitter<void>();

  PaymentStatus = PaymentStatus;

  getStatusClasses(): string {
    if (!this.payment) return 'bg-yellow-100 text-yellow-800';
    switch (this.payment.status) {
      case PaymentStatus.SUCCESS: return 'bg-green-100 text-green-800';
      case PaymentStatus.FAILED: return 'bg-red-100 text-red-800';
      case PaymentStatus.INITIATED: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
