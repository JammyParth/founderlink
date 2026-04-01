import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Message } from '../../shared/models/message.model';
import { MessageService } from './message.service';
import { SessionFacade } from '../../core/auth/session.facade';

@Injectable({
  providedIn: 'root'
})
export class MessagingFacade {
  private messageService = inject(MessageService);
  private sessionFacade = inject(SessionFacade);
  
  private partnersStateSubject = new BehaviorSubject<DataState<number[]>>(createInitialState());
  partnersState$: Observable<DataState<number[]>> = this.partnersStateSubject.asObservable();

  private conversationStateSubject = new BehaviorSubject<DataState<Message[]>>(createInitialState());
  conversationState$: Observable<DataState<Message[]>> = this.conversationStateSubject.asObservable();

  private sendStateSubject = new BehaviorSubject<DataState<Message>>(createInitialState());
  sendState$: Observable<DataState<Message>> = this.sendStateSubject.asObservable();

  loadPartners(): void {
    const currentUserId = this.sessionFacade.currentSession.userId;
    if (!currentUserId) return;

    this.partnersStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.messageService.getConversationPartners(currentUserId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.partnersStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        // Fallback to empty array on 404 or gracefully handle empty states
        const is404 = envelope.error?.includes('404');
        this.partnersStateSubject.next({ 
          data: is404 ? [] : null, 
          loadingState: is404 ? 'loaded' : 'error', 
          error: is404 ? null : envelope.error || 'Failed to load partners' 
        });
      }
    });
  }

  loadConversation(partnerId: number): void {
    const currentUserId = this.sessionFacade.currentSession.userId;
    if (!currentUserId) return;

    this.conversationStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.messageService.getConversation(currentUserId, partnerId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.conversationStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        const is404 = envelope.error?.includes('404');
        this.conversationStateSubject.next({ 
          data: is404 ? [] : null, 
          loadingState: is404 ? 'loaded' : 'error', 
          error: is404 ? null : envelope.error || 'Failed to load conversation' 
        });
      }
    });
  }

  sendMessage(receiverId: number, content: string): void {
    if (this.sendStateSubject.value.loadingState === 'loading') return; // Prevent duplicate requests
    // Security: never rely on UI to supply senderId. Handled implicitly by backend taking token, 
    // but DTO needs receiverId and content.
    this.sendStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.messageService.sendMessage({ receiverId, content }).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.sendStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        
        // Optimistically append to conversation
        const currentConv = this.conversationStateSubject.value.data;
        if (currentConv) {
          this.conversationStateSubject.next({
            ...this.conversationStateSubject.value,
            data: [...currentConv, envelope.data]
          });
        } else {
          this.loadConversation(receiverId);
        }
      } else {
        this.sendStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to send message' });
      }
    });
  }

  clearSendState(): void {
    this.sendStateSubject.next(createInitialState());
  }

  clearConversationState(): void {
    this.conversationStateSubject.next(createInitialState());
  }
}
