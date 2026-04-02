import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { SessionFacade } from '../../core/auth/session.facade';
import { UserRole } from '../../shared/models/auth.model';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationFacade } from '../../features/notifications/notification.facade';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50">
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-50">
        <h1 class="text-xl font-bold text-gray-900 cursor-pointer" routerLink="/">FounderLink</h1>
        
        <nav class="flex gap-6 items-center">
          <ng-container *ngIf="sessionFacade.session$ | async as session">
            
            <ng-container *ngIf="session.status === 'authenticated'">
              <a routerLink="/startups" class="text-sm font-medium text-gray-600 hover:text-gray-900">Discover</a>
              
              <a *ngIf="session.role === UserRole.FOUNDER" routerLink="/my-startups" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                My Startups
              </a>

              <a *ngIf="session.role === UserRole.INVESTOR" routerLink="/investments" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                Portfolio
              </a>

              <a *ngIf="session.role === UserRole.COFOUNDER" routerLink="/team/my-invitations" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                Invitations
              </a>

              <a *ngIf="session.role === UserRole.COFOUNDER" routerLink="/team/my-roles" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                My Teams
              </a>

              <a routerLink="/messages" class="text-sm font-medium text-gray-600 hover:text-gray-900">
                Messages
              </a>

              <a routerLink="/notifications" class="relative text-gray-600 hover:text-gray-900 flex items-center">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <ng-container *ngIf="notificationFacade.unreadState$ | async as unreadState">
                  <span *ngIf="unreadState.data && unreadState.data.length > 0" class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {{ unreadState.data.length > 99 ? '99+' : unreadState.data.length }}
                  </span>
                </ng-container>
              </a>

              <span class="text-sm text-gray-400">|</span>

              <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600 font-medium">
                  {{ session.email }}
                </span>
                <button (click)="logout()" class="text-sm text-red-600 hover:text-red-800 font-medium">
                  Logout
                </button>
              </div>
            </ng-container>

            <ng-container *ngIf="session.status !== 'authenticated'">
              <a routerLink="/" class="text-sm font-medium text-gray-600 hover:text-gray-900">Home</a>
              <a routerLink="/auth/login" class="text-blue-600 hover:underline font-medium">Login</a>
              <a routerLink="/auth/register" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm">Register</a>
            </ng-container>
            
          </ng-container>
        </nav>
      </header>

      <main class="flex-grow">
        <router-outlet></router-outlet>
      </main>

      <footer class="bg-gray-800 text-white p-6 text-center">
        <p class="text-sm">&copy; 2026 FounderLink. All rights reserved.</p>
      </footer>
    </div>
  `
})
export class AppShellComponent implements OnInit, OnDestroy {
  sessionFacade = inject(SessionFacade);
  authService = inject(AuthService);
  notificationFacade = inject(NotificationFacade);
  UserRole = UserRole;

  ngOnInit() {
    this.notificationFacade.startPolling();
  }

  ngOnDestroy() {
    this.notificationFacade.stopPolling();
  }

  logout() {
    this.authService.logout();
  }
}
