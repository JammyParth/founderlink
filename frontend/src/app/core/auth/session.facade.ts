import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthSession, UserRole } from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class SessionFacade {
  private initialState: AuthSession = {
    token: null,
    email: null,
    role: null,
    userId: null,
    status: 'anonymous'
  };

  private sessionSubject = new BehaviorSubject<AuthSession>(this.initialState);
  session$ = this.sessionSubject.asObservable();

  get currentSession(): AuthSession {
    return this.sessionSubject.value;
  }

  setSession(sessionData: Partial<AuthSession>): void {
    this.sessionSubject.next({
      ...this.currentSession,
      ...sessionData
    });
  }

  clearSession(): void {
    this.sessionSubject.next(this.initialState);
  }

  get isAuthenticated(): boolean {
    return this.currentSession.status === 'authenticated' && !!this.currentSession.token;
  }
}
