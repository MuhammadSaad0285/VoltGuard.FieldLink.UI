import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data?.['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return authService.refreshSession().pipe(
    map(session => {
      if (!session) {
        return router.createUrlTree(['/login']);
      }

      if (authService.hasAnyRole(requiredRoles)) {
        return true;
      }

      return router.createUrlTree(['/dashboard']);
    })
  );
};
