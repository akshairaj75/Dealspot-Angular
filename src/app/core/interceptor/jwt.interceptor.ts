import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token() || localStorage.getItem('token') || localStorage.getItem('dealspot_token');

  const isAuthEndpoint = req.url.includes('/auth/user/login') ||
    req.url.includes('/auth/admin/login') ||
    req.url.includes('/auth/user/register');

  // If token is expired and request requires authentication
  if (token && req.url.includes('/api') && !isAuthEndpoint) {
    if (authService.isTokenExpired(token)) {
      authService.logout('/login', true);
      return throwError(() => new Error('JWT token expired'));
    }

    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized on authenticated requests means token is expired/revoked
      if (error.status === 401 && !isAuthEndpoint) {
        if (authService.isAuthenticated() || token) {
          authService.logout('/login', true);
        }
      }
      return throwError(() => error);
    })
  );
};
