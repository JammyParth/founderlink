import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../shared/models/auth.model';

export const startupRoutes: Routes = [
  {
    path: '', // mapped from /startups in app.routes
    canActivate: [authGuard],
    loadComponent: () => import('./startup-discovery-page/startup-discovery-page.component').then(m => m.StartupDiscoveryPageComponent)
  },
  {
    path: 'edit/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('./startup-form-page/startup-form-page.component').then(m => m.StartupFormPageComponent)
  },
  {
    path: 'create',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('./startup-form-page/startup-form-page.component').then(m => m.StartupFormPageComponent)
  },
  {
    path: ':id/investments',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('../investments/founder-review-page/founder-review-page.component').then(m => m.FounderReviewPageComponent)
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () => import('./startup-detail-page/startup-detail-page.component').then(m => m.StartupDetailPageComponent)
  }
];

// Note: /my-startups is a separate root path mapped to founder's list
export const myStartupRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('./my-startups-page/my-startups-page.component').then(m => m.MyStartupsPageComponent)
  }
];
