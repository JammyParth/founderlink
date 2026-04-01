import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError, tap, timeout } from 'rxjs';
import { SessionFacade } from '../auth/session.facade';
import { AuthService } from '../auth/auth.service';

// State for refresh token queue
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const addTokenHeader = (request: HttpRequest<any>, token: string | null) => {
  if (token) {
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return request;
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionFacade = inject(SessionFacade);
  const authService = inject(AuthService);
  
  const token = sessionFacade.currentSession.token;
  let authReq = addTokenHeader(req, token);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't intercept requests to login/refresh or 403s
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return handle401Error(authReq, next, authService, sessionFacade);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(
  request: HttpRequest<any>, 
  next: HttpHandlerFn, 
  authService: AuthService,
  sessionFacade: SessionFacade
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refresh().pipe(
      switchMap(() => {
        isRefreshing = false;
        const newToken = sessionFacade.currentSession.token;
        refreshTokenSubject.next(newToken);
        return next(addTokenHeader(request, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    // Wait until refresh is done, then retry
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      timeout(15000),
      catchError(() => throwError(() => new Error('Token refresh timed out'))),
      switchMap(token => next(addTokenHeader(request, token)))
    );
  }
}
