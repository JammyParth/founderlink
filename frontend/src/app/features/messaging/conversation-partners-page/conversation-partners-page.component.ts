import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessagingFacade } from '../messaging.facade';

@Component({
  selector: 'app-conversation-partners-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto py-8">
      <div class="mb-8 border-b border-gray-200 pb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Messages</h1>
          <p class="mt-2 text-gray-600">Open a conversation and continue chatting with your existing contacts.</p>
        </div>

        <a
          routerLink="/startups"
          class="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
        >
          Find people to message
        </a>
      </div>

      <ng-container *ngIf="facade.partnersState$ | async as state">
        <div *ngIf="state.loadingState === 'idle' || state.loadingState === 'loading'" class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          <p>{{ state.error }}</p>
          <button (click)="loadPartners()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
        </div>

        <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'">
          <div *ngIf="state.data?.length === 0" class="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 class="text-xl font-semibold text-gray-900">No conversations yet</h2>
            <p class="mt-2 text-sm text-gray-500">Your active conversations will appear here once messages are exchanged.</p>
            <p class="mt-3 text-sm text-gray-500">Start by browsing startups and opening a founder profile to send the first message.</p>
            <a
              routerLink="/startups"
              class="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Browse startups
            </a>
          </div>

          <div *ngIf="state.data?.length" class="space-y-3">
            <a
              *ngFor="let partnerId of state.data; trackBy: trackByPartnerId"
              [routerLink]="['/messages', partnerId]"
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <p class="text-lg font-semibold text-gray-900">Conversation with User #{{ partnerId }}</p>
                <p class="mt-1 text-sm text-gray-500">Open the thread to view message history and reply.</p>
              </div>
              <span class="text-sm font-medium text-blue-600">Open</span>
            </a>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class ConversationPartnersPageComponent implements OnInit {
  readonly facade = inject(MessagingFacade);

  ngOnInit(): void {
    this.loadPartners();
  }

  loadPartners(): void {
    this.facade.loadPartners();
  }

  trackByPartnerId(_index: number, partnerId: number): number {
    return partnerId;
  }
}
