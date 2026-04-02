import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionFacade } from '../../../core/auth/session.facade';
import { Message } from '../../../shared/models/message.model';
import { UserService } from '../../profile/user.service';
import { MessagingFacade } from '../messaging.facade';

@Component({
  selector: 'app-conversation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto py-8">
      <a routerLink="/messages" class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
        <- Back to conversations
      </a>

      <div class="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div class="border-b border-gray-200 px-6 py-5">
          <h1 class="text-2xl font-bold text-gray-900">
            {{ partnerId ? ('Conversation with ' + partnerDisplayName) : 'Conversation' }}
          </h1>
          <p class="mt-1 text-sm text-gray-500">Review your message history and send new updates from here.</p>
        </div>

        <div *ngIf="!partnerId" class="px-6 py-12 text-center text-gray-500">
          This conversation link is invalid.
        </div>

        <ng-container *ngIf="partnerId">
          <ng-container *ngIf="facade.conversationState$ | async as state">
            <div *ngIf="state.loadingState === 'idle' || state.loadingState === 'loading'" class="flex justify-center items-center py-20">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>

            <div *ngIf="state.loadingState === 'error'" class="px-6 py-6">
              <div class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
                <p>{{ state.error }}</p>
                <button (click)="reloadConversation()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
              </div>
            </div>

            <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'" class="px-6 py-6">
              <div *ngIf="state.data?.length === 0" class="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">No messages yet</h2>
                  <p class="mt-2 text-sm text-gray-500">Start the conversation by sending the first message below.</p>
                </div>
              </div>

              <div *ngIf="state.data?.length" class="space-y-4">
                <div
                  *ngFor="let message of state.data; trackBy: trackByMessageId"
                  class="flex"
                  [class.justify-end]="isOwnMessage(message)"
                >
                  <div
                    class="max-w-xl rounded-2xl px-4 py-3 shadow-sm"
                    [class.bg-blue-600]="isOwnMessage(message)"
                    [class.text-white]="isOwnMessage(message)"
                    [class.bg-gray-100]="!isOwnMessage(message)"
                    [class.text-gray-900]="!isOwnMessage(message)"
                  >
                    <p class="whitespace-pre-wrap break-words text-sm leading-6">{{ message.content }}</p>
                    <p
                      class="mt-2 text-xs"
                      [class.text-blue-100]="isOwnMessage(message)"
                      [class.text-gray-500]="!isOwnMessage(message)"
                    >
                      {{ formatTimestamp(message.createdAt) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="facade.sendState$ | async as sendState">
            <div class="border-t border-gray-200 px-6 py-5">
              <div *ngIf="sendState.loadingState === 'error'" class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {{ sendState.error }}
              </div>

              <label for="message-content" class="mb-2 block text-sm font-medium text-gray-700">New message</label>
              <textarea
                id="message-content"
                [(ngModel)]="draftMessage"
                rows="4"
                class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Type your message here"
              ></textarea>

              <div class="mt-4 flex items-center justify-between">
                <p class="text-xs text-gray-500">Messages are sent directly to {{ partnerDisplayName }}.</p>
                <button
                  type="button"
                  (click)="submitMessage()"
                  [disabled]="sendState.loadingState === 'loading' || !draftMessage.trim()"
                  class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {{ sendState.loadingState === 'loading' ? 'Sending...' : 'Send message' }}
                </button>
              </div>
            </div>
          </ng-container>
        </ng-container>
      </div>
    </div>
  `
})
export class ConversationPageComponent implements OnInit, OnDestroy {
  readonly facade = inject(MessagingFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly sessionFacade = inject(SessionFacade);
  private readonly userService = inject(UserService);

  partnerId: number | null = null;
  currentUserId = this.sessionFacade.currentSession.userId;
  draftMessage = '';
  partnerName: string | null = null;

  private routeSubscription?: Subscription;
  private sendStateSubscription?: Subscription;
  private partnerProfileSubscription?: Subscription;

  ngOnInit(): void {
    this.facade.clearSendState();

    this.routeSubscription = this.route.paramMap.subscribe(paramMap => {
      const partnerId = Number(paramMap.get('partnerId'));

      if (!Number.isFinite(partnerId) || partnerId <= 0) {
        this.partnerId = null;
        this.partnerName = null;
        this.facade.clearConversationState();
        return;
      }

      this.partnerId = partnerId;
      this.partnerName = null;
      this.currentUserId = this.sessionFacade.currentSession.userId;
      this.loadPartnerProfile(partnerId);
      this.facade.loadConversation(partnerId);
    });

    this.sendStateSubscription = this.facade.sendState$.subscribe(state => {
      if (state.loadingState === 'loaded' && state.data && state.data.receiverId === this.partnerId) {
        this.draftMessage = '';
        this.facade.clearSendState();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.sendStateSubscription?.unsubscribe();
    this.partnerProfileSubscription?.unsubscribe();
    this.facade.clearConversationState();
    this.facade.clearSendState();
  }

  reloadConversation(): void {
    if (this.partnerId) {
      this.facade.loadConversation(this.partnerId);
    }
  }

  submitMessage(): void {
    const content = this.draftMessage.trim();

    if (!this.partnerId || !content) {
      return;
    }

    this.facade.sendMessage(this.partnerId, content);
  }

  get partnerDisplayName(): string {
    if (this.partnerName?.trim()) {
      return this.partnerName;
    }

    return this.partnerId ? `User #${this.partnerId}` : 'this user';
  }

  private loadPartnerProfile(partnerId: number): void {
    this.partnerProfileSubscription?.unsubscribe();
    this.partnerProfileSubscription = this.userService.getUserById(partnerId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.partnerName = envelope.data.name?.trim() || envelope.data.email;
      } else {
        this.partnerName = null;
      }
    });
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  trackByMessageId(_index: number, message: Message): number {
    return message.id;
  }

  formatTimestamp(value: Date | null): string {
    if (!value) {
      return 'Just now';
    }

    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(value);
  }
}
