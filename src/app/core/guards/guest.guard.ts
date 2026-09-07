import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is already logged in with a valid token, block login access
  if (authService.isAuthenticated() && !authService.isTokenExpired()) {
    if (authService.isAdmin()) {
      router.navigate(['/admin']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }

  // If token is present but expired, clean up silently
  if (authService.token() && authService.isTokenExpired()) {
    authService.logout('', false);
  }

  return true;
};
