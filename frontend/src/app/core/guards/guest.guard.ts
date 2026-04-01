import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionFacade } from '../auth/session.facade';

export const guestGuard: CanActivateFn = () => {
  const sessionFacade = inject(SessionFacade);
  const router = inject(Router);

  if (!sessionFacade.isAuthenticated) {
    return true;
  }

  // Already authenticated, redirect to home/dashboard
  return router.createUrlTree(['/']);
};
