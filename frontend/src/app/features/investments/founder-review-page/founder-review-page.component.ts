import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FounderInvestmentFacade } from '../founder-investment.facade';
import { InvestmentCardComponent } from '../components/investment-card.component';
import { FounderStartupFacade } from '../../startups/founder-startup.facade';

@Component({
  selector: 'app-founder-review-page',
  standalone: true,
  imports: [CommonModule, InvestmentCardComponent, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto py-8">
      <div class="mb-6 flex items-center gap-4">
        <a routerLink="/my-startups" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
          &larr; Back to My Startups
        </a>
      </div>

      <div class="mb-8 border-b border-gray-200 pb-4">
        <h1 class="text-3xl font-bold text-gray-900">Review Investments</h1>
        <p class="mt-2 text-gray-600">Manage incoming capital offers for your startup.</p>
      </div>

      <ng-container *ngIf="facade.listState$ | async as state">
        
        <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          <p>{{ state.error }}</p>
          <button (click)="loadAll()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
        </div>

        <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'">
          
          <div *ngIf="state.data?.length === 0" class="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 class="mt-2 text-lg font-medium text-gray-900">No investments received</h3>
            <p class="mt-1 text-sm text-gray-500 mb-6">Keep building and sharing your startup to attract investors.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <app-investment-card 
              *ngFor="let inv of state.data" 
              [investment]="inv"
              [isFounderMode]="true"
              (onApprove)="handleApprove($event)"
              (onReject)="handleReject($event)">
            </app-investment-card>
          </div>
          
        </div>
      </ng-container>
    </div>
  `
})
export class FounderReviewPageComponent implements OnInit {
  facade = inject(FounderInvestmentFacade);
  private route = inject(ActivatedRoute);
  startupId!: number;

  ngOnInit() {
    this.startupId = Number(this.route.snapshot.paramMap.get('startupId'));
    if (this.startupId) {
      this.loadAll();
    }
  }

  loadAll() {
    this.facade.loadInvestmentsForStartup(this.startupId);
  }

  handleApprove(investmentId: number) {
    if (confirm('Approve this investment? The investor will be prompted to complete payment.')) {
      this.facade.updateStatus(investmentId, 'APPROVED');
    }
  }

  handleReject(investmentId: number) {
    if (confirm('Reject this investment? This action cannot be undone.')) {
      this.facade.updateStatus(investmentId, 'REJECTED');
    }
  }
}
