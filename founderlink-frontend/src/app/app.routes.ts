import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LandingComponent } from './features/landing/landing';

export const routes: Routes = [

  // ── Public: Landing page (Static loading) ───────────────────────────────────────────────────
  {
    path: '',
    component: LandingComponent
  },

  // ── Public: Individual startup detail ─────────────────────────────────────
  {
    path: 'startup/:id',
    loadComponent: () => import('./features/landing/startup-detail/startup-detail').then(m => m.StartupDetailComponent)
  },

  // ── Auth (public) ──────────────────────────────────────────────────────────
  {
    path: 'auth',
    children: [
      { path: 'login',           loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
      { path: 'register',        loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ── Protected (dashboard shell) ────────────────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    children: [
      { path: '', canActivate: [roleGuard(['FOUNDER', 'INVESTOR', 'COFOUNDER'])], loadComponent: () => import('./features/dashboard/home/home').then(m => m.HomeComponent) },

      // Startups
      { path: 'startups',    canActivate: [roleGuard(['FOUNDER', 'INVESTOR', 'COFOUNDER'])], loadComponent: () => import('./features/startups/startups').then(m => m.StartupsComponent) },
      { path: 'my-startup',  canActivate: [roleGuard(['FOUNDER'])],                          loadComponent: () => import('./features/startups/my-startup/my-startup').then(m => m.MyStartupComponent) },

      // Team
      { path: 'team',        canActivate: [roleGuard(['FOUNDER', 'COFOUNDER'])],             loadComponent: () => import('./features/team/team').then(m => m.TeamComponent) },
      { path: 'invitations', canActivate: [roleGuard(['COFOUNDER'])],                        loadComponent: () => import('./features/team/invitations/invitations').then(m => m.InvitationsComponent) },

      // Investments
      { path: 'investments', canActivate: [roleGuard(['FOUNDER'])],                          loadComponent: () => import('./features/investments/investments').then(m => m.InvestmentsComponent) },
      { path: 'portfolio',   canActivate: [roleGuard(['INVESTOR'])],                         loadComponent: () => import('./features/investments/portfolio/portfolio').then(m => m.PortfolioComponent) },

      // Payments & Wallet
      { path: 'payments',    canActivate: [roleGuard(['INVESTOR'])],                         loadComponent: () => import('./features/payments/payments').then(m => m.PaymentsComponent) },
      { path: 'wallet',      canActivate: [roleGuard(['FOUNDER'])],                          loadComponent: () => import('./features/wallet/wallet').then(m => m.WalletComponent) },

      // Messages & Notifications
      { path: 'messages',       canActivate: [roleGuard(['FOUNDER', 'INVESTOR', 'COFOUNDER'])], loadComponent: () => import('./features/messages/messages').then(m => m.MessagesComponent) },
      { path: 'notifications',  canActivate: [roleGuard(['FOUNDER', 'INVESTOR', 'COFOUNDER'])], loadComponent: () => import('./features/notifications/notifications').then(m => m.NotificationsComponent) },

      // Profile
      { path: 'profile',     canActivate: [roleGuard(['FOUNDER', 'INVESTOR', 'COFOUNDER'])], loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent) },
    ]
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' }
];
