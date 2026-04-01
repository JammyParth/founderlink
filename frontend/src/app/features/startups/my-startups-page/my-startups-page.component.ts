import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FounderStartupFacade } from '../founder-startup.facade';
import { StartupCardComponent } from '../components/startup-card.component';

@Component({
  selector: 'app-my-startups-page',
  standalone: true,
  imports: [CommonModule, RouterLink, StartupCardComponent],
  template: `
    <div class="max-w-7xl mx-auto py-8">
      <div class="flex justify-between items-end mb-8 border-b border-gray-200 pb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">My Startups</h1>
          <p class="mt-2 text-gray-600">Manage your created startups.</p>
        </div>
        <a routerLink="/startups/create" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm">
          + Create Startup
        </a>
      </div>

      <ng-container *ngIf="facade.listState$ | async as state">
        
        <!-- Loading State -->
        <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          <p>{{ state.error }}</p>
          <button (click)="loadAll()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
        </div>

        <!-- Loaded/Reconciling State -->
        <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'">
          
          <div *ngIf="state.data?.length === 0" class="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 class="mt-2 text-lg font-medium text-gray-900">No startups created yet</h3>
            <p class="mt-1 text-sm text-gray-500 mb-6">Get started by creating your first startup profile.</p>
            <a routerLink="/startups/create" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm">
              Create Startup
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <app-startup-card 
              *ngFor="let startup of state.data" 
              [startup]="startup" 
              [showFounderControls]="true"
              (onDelete)="handleDelete($event)">
            </app-startup-card>
          </div>
          
        </div>
      </ng-container>
    </div>
  `
})
export class MyStartupsPageComponent implements OnInit {
  facade = inject(FounderStartupFacade);

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.facade.loadMyStartups();
  }

  handleDelete(id: number) {
    if (confirm('Are you sure you want to delete this startup? This action cannot be undone and will cancel all pending investments.')) {
      this.facade.delete(id);
    }
  }
}
