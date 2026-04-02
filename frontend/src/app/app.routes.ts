import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/startups/startup-list-page/startup-list-page.component').then(m => m.StartupListPageComponent)
      },
      {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
      },
      {
        path: 'startups',
        loadChildren: () => import('./features/startups/startup.routes').then(m => m.startupRoutes)
      },
      {
        path: 'my-startups',
        loadChildren: () => import('./features/startups/startup.routes').then(m => m.myStartupRoutes)
      },
      {
        path: 'investments',
        loadChildren: () => import('./features/investments/investment.routes').then(m => m.investmentRoutes)
      },
      {
        path: 'team',
        loadChildren: () => import('./features/team/team.routes').then(m => m.teamRoutes)
      },
      {
        path: 'messages',
        loadChildren: () => import('./features/messaging/messaging.routes').then(m => m.messagingRoutes)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notifications/notification.routes').then(m => m.notificationRoutes)
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/errors/forbidden-page/forbidden-page.component').then(m => m.ForbiddenPageComponent)
      },
      {
        path: 'not-found',
        loadComponent: () => import('./features/errors/not-found-page/not-found-page.component').then(m => m.NotFoundPageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/not-found'
  }
];
