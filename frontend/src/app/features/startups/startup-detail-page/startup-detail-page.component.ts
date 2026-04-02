import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { StartupDetailFacade } from '../startup-detail.facade';
import { SessionFacade } from '../../../core/auth/session.facade';
import { UserRole } from '../../../shared/models/auth.model';
import { InvestorInvestmentFacade } from '../../investments/investor-investment.facade';

@Component({
  selector: 'app-startup-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="mb-6">
        <a routerLink="/startups" class="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium">
          &larr; Back to Startups
        </a>
      </div>

      <ng-container *ngIf="facade.state$ | async as state">
        
        <!-- Loading -->
        <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error -->
        <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <h3 class="text-lg font-medium text-red-800">Error loading startup</h3>
          <p class="mt-2 text-red-600">{{ state.error }}</p>
          <a routerLink="/startups" class="mt-4 inline-block text-blue-600 underline">Return to discovery</a>
        </div>

        <!-- Content -->
        <div *ngIf="state.loadingState === 'loaded' && state.data as startup" class="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
          
          <div class="px-6 py-8 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 class="text-3xl font-extrabold text-gray-900">{{ startup.name }}</h1>
              <div class="mt-2 flex items-center gap-3 text-sm text-gray-500">
                <span class="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">{{ startup.stage }}</span>
                <span>&bull;</span>
                <span>{{ startup.industry }}</span>
                <span *ngIf="startup.createdAt">&bull;</span>
                <span *ngIf="startup.createdAt">Listed on {{ startup.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>
            
            <div class="flex-shrink-0 flex flex-col items-end">
              <div class="text-sm font-medium text-gray-500 mb-1">Funding Goal</div>
              <div class="text-3xl font-bold text-green-600">{{ startup.fundingGoal | currency:'USD':'symbol':'1.0-0' }}</div>
            </div>
          </div>

          <div class="px-6 py-6 space-y-8">
            <section>
              <h2 class="text-xl font-bold text-gray-900 mb-3">About the Startup</h2>
              <p class="text-gray-700 whitespace-pre-line leading-relaxed">{{ startup.description }}</p>
            </section>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section class="bg-red-50 p-6 rounded-lg border border-red-100">
                <h2 class="text-lg font-bold text-red-900 mb-2">The Problem</h2>
                <p class="text-red-800 whitespace-pre-line leading-relaxed">{{ startup.problemStatement }}</p>
              </section>

              <section class="bg-green-50 p-6 rounded-lg border border-green-100">
                <h2 class="text-lg font-bold text-green-900 mb-2">The Solution</h2>
                <p class="text-green-800 whitespace-pre-line leading-relaxed">{{ startup.solution }}</p>
              </section>
            </div>
          </div>
          
          <!-- Call to actions based on role -->
          <div class="px-6 py-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-4" *ngIf="sessionFacade.session$ | async as session">

            <ng-container *ngIf="session.status === 'anonymous'">
              <a
                routerLink="/auth/login"
                [queryParams]="{ returnUrl: '/startups/' + startup.id }"
                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm"
              >
                Login to connect
              </a>
            </ng-container>
            
            <ng-container *ngIf="session.role === UserRole.INVESTOR">
              <a
                [routerLink]="['/messages', startup.founderId]"
                class="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm border border-gray-300"
              >
                Message Founder
              </a>

              <div class="flex items-center gap-3">
                <input type="number" #investAmount min="1000" placeholder="Amount ($)" class="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-32">
                <button (click)="invest(startup.id, investAmount.value)" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md shadow-sm transition-colors">
                  Invest Now
                </button>
              </div>
            </ng-container>

            <ng-container *ngIf="session.status === 'authenticated' && session.userId !== startup.founderId && session.role !== UserRole.INVESTOR">
              <a
                [routerLink]="['/messages', startup.founderId]"
                class="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm border border-gray-300"
              >
                Message Founder
              </a>
            </ng-container>

            <ng-container *ngIf="session.role === UserRole.FOUNDER && session.userId === startup.founderId">
              <a [routerLink]="['/startups/edit', startup.id]" class="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm border border-gray-300">
                Edit Startup
              </a>
              <a [routerLink]="['/startups', startup.id, 'investments']" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm">
                Review Offers
              </a>
            </ng-container>
            
          </div>
          
        </div>
      </ng-container>
    </div>
  `
})
export class StartupDetailPageComponent implements OnInit, OnDestroy {
  facade = inject(StartupDetailFacade);
  sessionFacade = inject(SessionFacade);
  private router = inject(Router);
  private invFacade = inject(InvestorInvestmentFacade);
  private route = inject(ActivatedRoute);

  UserRole = UserRole;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.facade.loadById(id);
    }
  }

  invest(startupId: number, amountStr: string) {
    const amount = Number(amountStr);
    if (!amount || amount < 1000) {
      alert('Please enter a valid investment amount (min $1000).');
      return;
    }
    
    if (confirm(`Commit to investing $${amount}?`)) {
      this.invFacade.createInvestment({ startupId, amount });
      this.router.navigate(['/investments']);
    }
  }

  ngOnDestroy() {
    this.facade.clear();
  }
}
