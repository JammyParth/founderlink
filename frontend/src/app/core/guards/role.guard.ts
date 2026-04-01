import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionFacade } from '../auth/session.facade';

export const roleGuard: CanActivateFn = (route) => {
  const sessionFacade = inject(SessionFacade);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as string[];
  const userRole = sessionFacade.currentSession.role;

  if (sessionFacade.isAuthenticated && userRole && allowedRoles?.includes(userRole)) {
    return true;
  }

  // Not authorized, redirect to forbidden
  return router.createUrlTree(['/forbidden']);
};
