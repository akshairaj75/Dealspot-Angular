import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

/**
 * Guard that allows only SUPER_ADMIN (or CONTENT_MANAGER where applicable)
 * to access system-level administrative modules.
 */
export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated() || authService.isTokenExpired()) {
    router.navigate(['/login'], { queryParams: { admin: 'true', returnUrl: state.url } });
    return false;
  }

  const user = authService.currentUser();
  const role = (user?.role || '').toUpperCase();

  if (role === 'SUPER_ADMIN' || role === 'CONTENT_MANAGER') {
    return true;
  }

  // If Store Manager or other role attempts access to Super Admin route
  const isArabic = localStorage.getItem('dealspot_lang') === 'ar' || document.documentElement.dir === 'rtl';
  Swal.fire({
    icon: 'warning',
    title: isArabic ? 'غير مصرح به' : 'Access Restricted',
    text: isArabic
      ? 'هذا القسم مخصص للمدير العام فقط.'
      : 'This module is restricted to Super Administrators.',
    confirmButtonColor: '#10b981',
    confirmButtonText: isArabic ? 'حسناً' : 'OK',
    timer: 3000
  });

  router.navigate(['/admin']);
  return false;
};
