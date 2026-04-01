import { ErrorHandler, Injectable, Injector, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private injector: Injector, 
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  handleError(error: Error | HttpErrorResponse): void {
    const router = this.injector.get(Router);

    if (error instanceof HttpErrorResponse) {
      // Server or connection error
      if (isPlatformBrowser(this.platformId) && !navigator.onLine) {
        console.error('No Internet Connection');
      } else {
        // Handle specific HTTP errors
        if (error.status === 403) {
          this.zone.run(() => router.navigate(['/forbidden']));
        } else if (error.status === 404) {
          this.zone.run(() => router.navigate(['/not-found']));
        } else {
          console.error(`Backend returned code ${error.status}, body was: `, error.error);
        }
      }
    } else {
      // Client Error (Angular Error, ReferenceError...)
      console.error('Client Error: ', error.message || error);
    }
  }
}
