import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && !authService.isTokenExpired()) {
    return true;
  }

  // If token is present but expired, log out with expired notice
  if (authService.token() && authService.isTokenExpired()) {
    authService.logout('/login', true);
  } else {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  }

  return false;
};
