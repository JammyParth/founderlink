import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, filter, switchMap, tap, catchError, of, EMPTY, distinctUntilChanged, shareReplay, Observable } from 'rxjs';
import { UserProfile } from '../../shared/models/user.model';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { SessionFacade } from '../../core/auth/session.facade';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class CurrentUserFacade {
  private sessionFacade = inject(SessionFacade);
  private userService = inject(UserService);

  private stateSubject = new BehaviorSubject<DataState<UserProfile>>(createInitialState());
  // Use shareReplay(1) so multiple subscribers don't trigger pipeline side-effects
  state$: Observable<DataState<UserProfile>> = this.stateSubject.asObservable().pipe(shareReplay(1));

  constructor() {
    // Automatically load user profile when authenticated
    this.sessionFacade.session$.pipe(
      tap(session => {
        if (session.status === 'anonymous' || !session.userId) {
          this.stateSubject.next(createInitialState());
        }
      }),
      filter(session => session.status === 'authenticated' && session.userId !== null),
      distinctUntilChanged((prev, curr) => prev.userId === curr.userId && prev.status === curr.status),
      switchMap(session => {
        this.stateSubject.next({ ...this.stateSubject.value, loadingState: 'loading' });
        return this.userService.getUserById(session.userId!).pipe(
          tap(envelope => {
            if (envelope.success && envelope.data) {
              this.stateSubject.next({
                data: envelope.data,
                loadingState: 'loaded',
                error: null
              });
            } else {
              this.stateSubject.next({
                data: null,
                loadingState: 'error',
                error: envelope.error || 'Failed to load profile'
              });
            }
          }),
          catchError(() => {
             this.stateSubject.next({
                data: null,
                loadingState: 'error',
                error: 'Network error loading profile'
              });
              return EMPTY;
          })
        );
      })
    ).subscribe();
  }

  updateProfile(data: any) {
    const currentUserId = this.sessionFacade.currentSession.userId;
    if (!currentUserId) return;

    this.stateSubject.next({ ...this.stateSubject.value, loadingState: 'reconciling' });

    this.userService.updateUser(currentUserId, data).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.stateSubject.next({
          data: envelope.data,
          loadingState: 'loaded',
          error: null
        });
      } else {
        this.stateSubject.next({
          ...this.stateSubject.value,
          loadingState: 'error',
          error: envelope.error || 'Failed to update profile'
        });
      }
    });
  }

  clearState() {
    this.stateSubject.next(createInitialState());
  }
}
