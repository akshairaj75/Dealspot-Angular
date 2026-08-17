import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('dealspot_admin_token') || localStorage.getItem('dealspot_token');
  const userJson = localStorage.getItem('dealspot_admin_user') || localStorage.getItem('dealspot_user');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      // Check if user is admin
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || state.url.startsWith('/admin')) {
        return true;
      }
    } catch (e) {
      // JSON parse error
    }
  }

  // Redirect to admin login
  router.navigate(['/login'], { queryParams: { admin: true, returnUrl: state.url } });
  return false;
};
