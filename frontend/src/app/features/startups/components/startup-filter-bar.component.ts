import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StartupStage } from '../../../shared/models/startup.model';

@Component({
  selector: 'app-startup-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="industry" class="block text-sm font-medium text-gray-700">Industry</label>
        <input type="text" id="industry" [(ngModel)]="filters.industry" placeholder="e.g. Fintech" 
               class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
      </div>
      
      <div class="flex-1">
        <label for="stage" class="block text-sm font-medium text-gray-700">Stage</label>
        <select id="stage" [(ngModel)]="filters.stage" 
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          <option value="">All Stages</option>
          <option *ngFor="let stage of stages" [value]="stage">{{ stage }}</option>
        </select>
      </div>

      <div class="flex-1">
        <label for="minFunding" class="block text-sm font-medium text-gray-700">Min Goal ($)</label>
        <input type="number" id="minFunding" [(ngModel)]="filters.minFunding" placeholder="1000" min="1000"
               class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
      </div>

      <div class="flex-1">
        <label for="maxFunding" class="block text-sm font-medium text-gray-700">Max Goal ($)</label>
        <input type="number" id="maxFunding" [(ngModel)]="filters.maxFunding" placeholder="Any" min="1000"
               class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
      </div>

      <div class="flex items-end gap-2">
        <button (click)="applyFilters()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm">
          Search
        </button>
        <button (click)="clearFilters()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm border border-gray-300">
          Clear
        </button>
      </div>
    </div>
  `
})
export class StartupFilterBarComponent {
  @Output() filterChanged = new EventEmitter<any>();

  stages = Object.values(StartupStage);
  
  filters: { industry: string, stage: string, minFunding: number | null, maxFunding: number | null } = {
    industry: '',
    stage: '',
    minFunding: null,
    maxFunding: null
  };

  applyFilters() {
    const payload: any = {};
    if (this.filters.industry) payload.industry = this.filters.industry;
    if (this.filters.stage) payload.stage = this.filters.stage;
    if (this.filters.minFunding) payload.minFunding = this.filters.minFunding;
    if (this.filters.maxFunding) payload.maxFunding = this.filters.maxFunding;
    
    this.filterChanged.emit(payload);
  }

  clearFilters() {
    this.filters = { industry: '', stage: '', minFunding: null, maxFunding: null };
    this.filterChanged.emit({});
  }
}
