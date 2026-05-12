import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.loading()) await auth.bootstrap();
  if (!auth.session()) return router.createUrlTree(['/login']);
  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.loading()) await auth.bootstrap();
  if (!auth.session()) return router.createUrlTree(['/login']);
  return auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};
