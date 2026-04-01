import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, timer, filter, switchMap, catchError, of, EMPTY, tap } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { AppNotification } from '../../shared/models/notification.model';
import { NotificationService } from './notification.service';
import { SessionFacade } from '../../core/auth/session.facade';

@Injectable({
  providedIn: 'root'
})
export class NotificationFacade {
  private notificationService = inject(NotificationService);
  private sessionFacade = inject(SessionFacade);
  
  private listStateSubject = new BehaviorSubject<DataState<AppNotification[]>>(createInitialState());
  listState$: Observable<DataState<AppNotification[]>> = this.listStateSubject.asObservable();

  private unreadStateSubject = new BehaviorSubject<DataState<AppNotification[]>>(createInitialState());
  unreadState$: Observable<DataState<AppNotification[]>> = this.unreadStateSubject.asObservable();

  private pollingSub: Subscription | null = null;

  startPolling(): void {
    if (this.pollingSub) return; // Already polling

    let consecutiveFailures = 0;

    // Poll every 60s, but only if user is authenticated
    this.pollingSub = timer(0, 60000).pipe(
      switchMap(() => {
        const session = this.sessionFacade.currentSession;
        if (session.status === 'authenticated' && session.userId) {
          // Check if document is visible to save battery/network
          if (typeof document !== 'undefined' && document.hidden) {
            return EMPTY;
          }
          return this.notificationService.getUnreadNotifications(session.userId).pipe(
            tap(() => { consecutiveFailures = 0; }),
            catchError(() => {
              consecutiveFailures++;
              if (consecutiveFailures >= 3) {
                this.unreadStateSubject.next({ ...this.unreadStateSubject.value, error: 'Notifications may be out of sync' });
              }
              return EMPTY;
            })
          );
        }
        return EMPTY;
      })
    ).subscribe((envelope: any) => {
      if (envelope && envelope.success) {
        this.unreadStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      }
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }

  loadAll(): void {
    const userId = this.sessionFacade.currentSession.userId;
    if (!userId) return;

    this.listStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.notificationService.getNotifications(userId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.listStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        const is404 = envelope.error?.includes('404');
        this.listStateSubject.next({ 
          data: is404 ? [] : null, 
          loadingState: is404 ? 'loaded' : 'error', 
          error: is404 ? null : envelope.error || 'Failed to load notifications' 
        });
      }
    });
  }

  markAsRead(notificationId: number): void {
    // Optimistic update
    const currentUnread = this.unreadStateSubject.value.data || [];
    const currentAll = this.listStateSubject.value.data || [];

    this.unreadStateSubject.next({
      data: currentUnread.filter(n => n.id !== notificationId),
      loadingState: 'reconciling',
      error: null
    });

    this.listStateSubject.next({
      data: currentAll.map(n => n.id === notificationId ? { ...n, read: true } : n),
      loadingState: 'reconciling',
      error: null
    });

    this.notificationService.markAsRead(notificationId).subscribe(envelope => {
      if (envelope.success) {
        this.unreadStateSubject.next({ ...this.unreadStateSubject.value, loadingState: 'loaded' });
        this.listStateSubject.next({ ...this.listStateSubject.value, loadingState: 'loaded' });
      } else {
        // We could rollback here if critical, but for notifications, ignoring is usually fine
        this.unreadStateSubject.next({ ...this.unreadStateSubject.value, loadingState: 'error', error: envelope.error });
      }
    });
  }
}
