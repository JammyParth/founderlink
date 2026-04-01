import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InvestorInvestmentFacade } from '../investor-investment.facade';
import { PaymentFacade, PaymentViewState } from '../../payments/payment.facade';
import { InvestmentStatusBadgeComponent } from '../components/investment-status-badge.component';
import { PaymentPanelComponent } from '../components/payment-panel.component';
import { InvestmentStatus } from '../../../shared/models/investment.model';
import { RazorpayService } from '../../payments/razorpay.service';

@Component({
  selector: 'app-investment-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, InvestmentStatusBadgeComponent, PaymentPanelComponent],
  template: `
    <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="mb-6">
        <a routerLink="/investments" class="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium">
          &larr; Back to Portfolio
        </a>
      </div>

      <ng-container *ngIf="invFacade.detailState$ | async as state">
        
        <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <h3 class="text-lg font-medium text-red-800">Error loading investment</h3>
          <p class="mt-2 text-red-600">{{ state.error }}</p>
        </div>

        <div *ngIf="state.loadingState === 'loaded' && state.data as investment" class="space-y-6">
          
          <div class="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <div class="px-6 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
              <div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Investment in Startup #{{ investment.startupId }}</h1>
                <div class="text-sm text-gray-500">Committed on {{ investment.createdAt | date:'mediumDate' }}</div>
              </div>
              <app-investment-status-badge [status]="investment.status"></app-investment-status-badge>
            </div>
            
            <div class="px-6 py-6 grid grid-cols-2 gap-6">
              <div>
                <div class="text-sm font-medium text-gray-500">Amount</div>
                <div class="text-3xl font-bold text-green-600">{{ investment.amount | currency:'USD':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>

          <!-- Payment Panel -->
          <ng-container *ngIf="payFacade.viewState$ | async as viewState">
            <ng-container *ngIf="viewState.showPanel">
              <ng-container *ngIf="payFacade.state$ | async as payState">
                
                <div *ngIf="payState.loadingState === 'loading'" class="bg-white p-6 rounded-lg shadow border border-gray-200 text-center text-gray-500">
                  Loading payment details...
                </div>

                <div *ngIf="payState.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
                  {{ payState.error }}
                </div>

                <app-payment-panel *ngIf="payState.loadingState === 'loaded' || payState.loadingState === 'reconciling'"
                  [payment]="payState.data"
                  [viewState]="viewState"
                  (onInitiate)="handlePaymentInitiate(investment.id)"
                  (onResume)="handlePaymentInitiate(investment.id)"
                  (onRetry)="handlePaymentInitiate(investment.id)">
                </app-payment-panel>
                
              </ng-container>
            </ng-container>
          </ng-container>

        </div>
      </ng-container>
    </div>
  `
})
export class InvestmentDetailPageComponent implements OnInit, OnDestroy {
  invFacade = inject(InvestorInvestmentFacade);
  payFacade = inject(PaymentFacade);
  private razorpayService = inject(RazorpayService);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.invFacade.loadInvestmentById(id);
      
      // Connect facade orchestration (replaces manual component subscription)
      this.payFacade.connectToInvestment(this.invFacade.detailState$);
    }

    // Listen to order creation to launch Razorpay
    this.payFacade.orderState$.subscribe(orderState => {
      if (orderState.loadingState === 'loaded' && orderState.data) {
        this.launchRazorpay(orderState.data);
      } else if (orderState.loadingState === 'error') {
        alert(orderState.error); // Basic error fallback
      }
    });
  }

  handlePaymentInitiate(investmentId: number) {
    this.payFacade.createOrder(investmentId);
  }

  private launchRazorpay(orderData: any) {
    this.razorpayService.launchPayment(orderData).subscribe({
      next: (response) => {
        this.payFacade.confirmPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature
        }, orderData.investmentId);
      },
      error: (err) => {
        alert(err.message);
      }
    });
  }

  ngOnDestroy() {
    this.invFacade.clearDetailState();
  }
}
