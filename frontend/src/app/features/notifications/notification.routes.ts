import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const notificationRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./notifications-page/notifications-page.component').then(m => m.NotificationsPageComponent)
  }
];
