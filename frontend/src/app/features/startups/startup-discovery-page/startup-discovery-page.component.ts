import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StartupDiscoveryFacade } from '../startup-discovery.facade';
import { StartupCardComponent } from '../components/startup-card.component';
import { StartupFilterBarComponent } from '../components/startup-filter-bar.component';

@Component({
  selector: 'app-startup-discovery-page',
  standalone: true,
  imports: [CommonModule, StartupCardComponent, StartupFilterBarComponent],
  template: `
    <div class="max-w-7xl mx-auto py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Discover Startups</h1>
        <p class="mt-2 text-gray-600">Find and invest in the next big thing.</p>
      </div>

      <app-startup-filter-bar (filterChanged)="onSearch($event)"></app-startup-filter-bar>

      <ng-container *ngIf="facade.isSearchActive$ | async as isSearchActive">
        <ng-container *ngIf="(isSearchActive ? facade.searchState$ : facade.listState$) | async as state">
          
          <!-- Loading State -->
          <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>

          <!-- Error State -->
          <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
            <p>{{ state.error }}</p>
            <button (click)="loadAll()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
          </div>

          <!-- Loaded State -->
          <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'">
            
            <div *ngIf="state.data?.length === 0" class="text-center py-20 bg-white rounded-lg border border-gray-200">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">{{ isSearchActive ? 'No search results found' : 'No startups found' }}</h3>
              <p class="mt-1 text-sm text-gray-500">Try adjusting your search filters.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <app-startup-card *ngFor="let startup of state.data" [startup]="startup"></app-startup-card>
            </div>
            
          </div>
        </ng-container>
      </ng-container>
    </div>
  `
})
export class StartupDiscoveryPageComponent implements OnInit {
  facade = inject(StartupDiscoveryFacade);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.facade.loadAll();
  }

  onSearch(filters: any) {
    if (Object.keys(filters).length === 0) {
      this.facade.loadAll();
    } else {
      this.facade.search(filters);
    }
  }
}
