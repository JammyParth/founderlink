import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionFacade } from '../auth/session.facade';

export const authGuard: CanActivateFn = (route, state) => {
  const sessionFacade = inject(SessionFacade);
  const router = inject(Router);

  if (sessionFacade.isAuthenticated) {
    return true;
  }

  // Redirect to login (to be built in Phase 1)
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
