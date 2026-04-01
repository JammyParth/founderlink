import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvestorInvestmentFacade } from '../investor-investment.facade';
import { InvestmentCardComponent } from '../components/investment-card.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-investor-portfolio-page',
  standalone: true,
  imports: [CommonModule, InvestmentCardComponent, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto py-8">
      <div class="mb-8 border-b border-gray-200 pb-4 flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">My Portfolio</h1>
          <p class="mt-2 text-gray-600">Track and manage your startup investments.</p>
        </div>
        <a routerLink="/startups" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md shadow-sm">
          Discover More
        </a>
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
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-900">No investments yet</h3>
            <p class="mt-1 text-sm text-gray-500 mb-6">Start building your portfolio by exploring startups.</p>
            <a routerLink="/startups" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm">
              Explore Startups
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <app-investment-card 
              *ngFor="let inv of state.data" 
              [investment]="inv"
              [isFounderMode]="false">
            </app-investment-card>
          </div>
          
        </div>
      </ng-container>
    </div>
  `
})
export class InvestorPortfolioPageComponent implements OnInit {
  facade = inject(InvestorInvestmentFacade);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.facade.loadInvestorPortfolio();
  }
}
