import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const messagingRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./conversation-partners-page/conversation-partners-page.component').then(m => m.ConversationPartnersPageComponent)
  },
  {
    path: ':partnerId',
    canActivate: [authGuard],
    loadComponent: () => import('./conversation-page/conversation-page.component').then(m => m.ConversationPageComponent)
  }
];
