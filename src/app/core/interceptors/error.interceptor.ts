import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';

export const SUPPRESS_API_ERROR_LOG = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const storage = inject(StorageService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!request.context.get(SUPPRESS_API_ERROR_LOG)) {
        console.error('API error:', error);
      }

      const isLoginRequest = request.url.includes('/auth/login');

      if (error.status === 401 && !isLoginRequest) {
        storage.clearSession();

        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      return throwError(() => error);
    })
  );
};
