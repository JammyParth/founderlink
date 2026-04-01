import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Startup } from '../../../shared/models/startup.model';

@Component({
  selector: 'app-startup-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
      <div class="p-6 flex-grow">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-900 truncate pr-4">{{ startup.name }}</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {{ startup.stage }}
          </span>
        </div>
        
        <p class="text-sm text-gray-500 mb-4">{{ startup.industry }}</p>
        <p class="text-gray-700 line-clamp-3 mb-4 flex-grow">{{ startup.description }}</p>
        
        <div class="mt-auto">
          <div class="flex items-center text-sm text-gray-600">
            <span class="font-medium text-gray-900 mr-2">Goal:</span> 
            {{ startup.fundingGoal | currency:'USD':'symbol':'1.0-0' }}
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center gap-2">
        <a [routerLink]="['/startups', startup.id]" class="text-blue-600 hover:text-blue-800 font-medium text-sm flex-1 text-center py-1">
          View Details
        </a>
        
        <ng-container *ngIf="showFounderControls">
          <a [routerLink]="['/startups/edit', startup.id]" class="text-gray-600 hover:text-gray-900 font-medium text-sm px-2">
            Edit
          </a>
          <button (click)="onDelete.emit(startup.id)" class="text-red-600 hover:text-red-800 font-medium text-sm px-2">
            Delete
          </button>
        </ng-container>
      </div>
    </div>
  `
})
export class StartupCardComponent {
  @Input({ required: true }) startup!: Startup;
  @Input() showFounderControls = false;
  
  @Output() onDelete = new EventEmitter<number>();
}
