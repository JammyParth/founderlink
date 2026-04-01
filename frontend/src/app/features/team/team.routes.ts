import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../shared/models/auth.model';

export const teamRoutes: Routes = [
  {
    path: 'my-invitations',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.COFOUNDER] },
    loadComponent: () => import('./my-invitations-page/my-invitations-page.component').then(m => m.MyInvitationsPageComponent)
  },
  {
    path: 'my-roles',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.COFOUNDER] },
    loadComponent: () => import('./my-roles-page/my-roles-page.component').then(m => m.MyRolesPageComponent)
  },
  {
    path: 'startup/:startupId/team',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('./team-members-page/team-members-page.component').then(m => m.TeamMembersPageComponent)
  },
  {
    path: 'startup/:startupId/invitations',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.FOUNDER] },
    loadComponent: () => import('./startup-invitations-page/startup-invitations-page.component').then(m => m.StartupInvitationsPageComponent)
  }
];
