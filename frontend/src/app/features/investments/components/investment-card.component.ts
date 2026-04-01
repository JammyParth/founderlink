import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Investment, InvestmentStatus } from '../../../shared/models/investment.model';
import { InvestmentStatusBadgeComponent } from './investment-status-badge.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-investment-card',
  standalone: true,
  imports: [CommonModule, InvestmentStatusBadgeComponent, RouterLink],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div class="p-5 flex-grow">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-gray-900 truncate pr-4">
              {{ isFounderMode ? 'Investor #' + investment.investorId : 'Startup #' + investment.startupId }}
            </h3>
            <div class="text-sm text-gray-500 mt-1" *ngIf="investment.createdAt">
              {{ investment.createdAt | date:'mediumDate' }}
            </div>
          </div>
          <app-investment-status-badge [status]="investment.status"></app-investment-status-badge>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-end">
          <div class="text-sm font-medium text-gray-500">Amount</div>
          <div class="text-xl font-bold text-green-600">{{ investment.amount | currency:'USD':'symbol':'1.0-0' }}</div>
        </div>
      </div>
      
      <div class="bg-gray-50 px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
        <a [routerLink]="['/investments', investment.id]" class="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1">
          View Details
        </a>
        
        <ng-container *ngIf="isFounderMode && investment.status === InvestmentStatus.PENDING">
          <button (click)="onApprove.emit(investment.id)" class="bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm px-3 py-1 rounded shadow-sm">
            Approve
          </button>
          <button (click)="onReject.emit(investment.id)" class="bg-white border border-gray-300 text-red-600 hover:bg-red-50 font-medium text-sm px-3 py-1 rounded shadow-sm">
            Reject
          </button>
        </ng-container>
      </div>
    </div>
  `
})
export class InvestmentCardComponent {
  @Input({ required: true }) investment!: Investment;
  @Input() isFounderMode = false;
  
  @Output() onApprove = new EventEmitter<number>();
  @Output() onReject = new EventEmitter<number>();

  InvestmentStatus = InvestmentStatus;
}
