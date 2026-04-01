import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SessionFacade } from './session.facade';
import { environment } from '../../../environments/environment';
import { LoginResponse, UserRole } from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private sessionFacade = inject(SessionFacade);
  private baseUrl = environment.apiBaseUrl + '/auth';
  private isLoggingOut = false;

  constructor() {
    // Listen for logout events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'founderlink_logout') {
          this.handleLocalLogout();
        }
      });
    }
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  login(credentials: any): Observable<LoginResponse> {
    this.sessionFacade.setSession({ status: 'authenticating' });
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials, { withCredentials: true })
      .pipe(
        tap({
          next: (res) => {
            this.sessionFacade.setSession({
              token: res.token,
              email: res.email,
              role: res.role as UserRole,
              userId: res.userId,
              status: 'authenticated'
            });
          },
          error: () => {
            this.sessionFacade.setSession({ status: 'anonymous' });
          }
        })
      );
  }

  refresh(): Observable<LoginResponse> {
    this.sessionFacade.setSession({ status: 'refreshing' });
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap({
          next: (res) => {
            this.sessionFacade.setSession({
              token: res.token,
              email: res.email,
              role: res.role as UserRole,
              userId: res.userId,
              status: 'authenticated'
            });
          },
          error: () => {
            this.logout();
          }
        })
      );
  }

  logout(): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    // Clear session immediately for quick UI feedback, then attempt backend logout
    this.handleLocalLogout();
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  private handleLocalLogout(): void {
    this.sessionFacade.clearSession();
    // Signal other tabs to also logout
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('founderlink_logout', Date.now().toString()); } catch (_) {}
    }
    // Use window.location to force a full reload and clear any transient state, 
    // ensuring user is booted back to login securely without leaving stale state in memory.
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
      window.location.href = '/auth/login';
    }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, data);
  }
}
