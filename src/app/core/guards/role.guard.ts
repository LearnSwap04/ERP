import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Role } from '../models';
import { AuthService } from '../services/auth.service';

/** Blocks unauthenticated users, redirecting to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  void router.navigate(['/login']);
  return false;
};

/** Requires one of the given roles; redirects to the user's own home otherwise. */
export function roleGuard(roles: ReadonlyArray<Role>): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();
    if (role && roles.includes(role)) return true;
    if (role) {
      void router.navigate([auth.homeForRole(role)], { replaceUrl: true });
    } else {
      void router.navigate(['/login']);
    }
    return false;
  };
}