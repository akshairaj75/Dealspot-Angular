import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

export interface AuthUser {
  id: number | string;
  fullName: string;
  email: string;
  accountType: 'USER' | 'ADMIN' | string;
  role: string;
  storeId?: number | null;
}

export interface AuthResponse {
  id: number;
  fullName: string;
  email: string;
  token: string;
  accountType: string;
  role: string;
  storeId?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl + '/auth';

  private autoLogoutTimer?: any;

  // State Signals
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());
  token = signal<string | null>(this.loadTokenFromStorage());

  constructor() {
    const currentToken = this.token();
    if (currentToken) {
      if (this.isTokenExpired(currentToken)) {
        this.clearStorage();
        this.currentUser.set(null);
        this.token.set(null);
      } else {
        this.scheduleAutoLogout(currentToken);
      }
    }
  }

  // Computed state
  isAuthenticated = computed(() => {
    const tok = this.token();
    const user = this.currentUser();
    return !!tok && !!user && !this.isTokenExpired(tok);
  });

  isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user || !this.token() || this.isTokenExpired(this.token())) return false;
    const role = (user.role || '').toUpperCase();
    const accountType = (user.accountType || '').toUpperCase();
    return accountType === 'ADMIN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STORE_MANAGER' || role === 'STORE_ADMIN' || role === 'CONTENT_MANAGER';
  });

  isStoreManager = computed(() => {
    const user = this.currentUser();
    return !!user && !this.isTokenExpired(this.token()) && (user.role === 'STORE_MANAGER' || !!user.storeId);
  });

  isSuperAdmin = computed(() => {
    const user = this.currentUser();
    return !!user && !this.isTokenExpired(this.token()) && user.role === 'SUPER_ADMIN';
  });

  /**
   * Safely checks if a JWT token is expired
   */
  isTokenExpired(token: string | null = this.token()): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      if (!decoded.exp) return false;
      // Exp is in seconds; Date.now() is in ms. Buffer with 5 seconds to prevent race conditions
      return (decoded.exp * 1000) <= (Date.now() + 5000);
    } catch {
      return true;
    }
  }

  /**
   * Schedules an auto-logout timer based on the token's remaining validity
   */
  private scheduleAutoLogout(token: string): void {
    this.clearAutoLogoutTimer();
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        if (decoded.exp) {
          const expiresInMs = (decoded.exp * 1000) - Date.now();
          if (expiresInMs > 0) {
            const maxTimeout = 2147483647; // 32-bit max delay (~24.8 days)
            const delay = Math.min(expiresInMs, maxTimeout);
            this.autoLogoutTimer = setTimeout(() => {
              this.logout('/login', true);
            }, delay);
          } else {
            this.logout('/login', true);
          }
        }
      }
    } catch (e) {
      console.warn('Could not schedule auto logout timer:', e);
    }
  }

  private clearAutoLogoutTimer(): void {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
      this.autoLogoutTimer = undefined;
    }
  }

  private loadTokenFromStorage(): string | null {
    const raw = localStorage.getItem('dealspot_token') || localStorage.getItem('token');
    if (!raw) return null;
    if (this.isTokenExpired(raw)) {
      this.clearStorage();
      return null;
    }
    return raw;
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem('dealspot_user') || localStorage.getItem('user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      const token = localStorage.getItem('dealspot_token') || localStorage.getItem('token');
      if (this.isTokenExpired(token)) {
        this.clearStorage();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('dealspot_token');
    localStorage.removeItem('token');
    localStorage.removeItem('dealspot_user');
    localStorage.removeItem('user');
    localStorage.removeItem('dealspot_admin_token');
    localStorage.removeItem('dealspot_admin_user');
  }

  private saveSession(res: AuthResponse): void {
    const user: AuthUser = {
      id: res.id,
      fullName: res.fullName,
      email: res.email,
      accountType: res.accountType || (res.role === 'USER' ? 'USER' : 'ADMIN'),
      role: res.role || 'USER',
      storeId: res.storeId || null
    };

    localStorage.setItem('dealspot_token', res.token);
    localStorage.setItem('token', res.token);
    localStorage.setItem('dealspot_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    this.token.set(res.token);
    this.currentUser.set(user);

    this.scheduleAutoLogout(res.token);
  }

  userLogin(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + '/user/login', data).pipe(
      tap(res => this.saveSession(res))
    );
  }

  userRegister(data: { fullName: string; email: string; phone: string; password: string; cityId: number }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + '/user/register', data).pipe(
      tap(res => this.saveSession(res))
    );
  }

  adminLogin(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + '/admin/login', data).pipe(
      tap(res => this.saveSession(res))
    );
  }

  logout(redirectUrl = '/login', showExpiredNotice = false): void {
    this.clearAutoLogoutTimer();
    this.clearStorage();

    this.token.set(null);
    this.currentUser.set(null);

    if (showExpiredNotice) {
      const isArabic = localStorage.getItem('dealspot_lang') === 'ar' || document.documentElement.dir === 'rtl';
      Swal.fire({
        icon: 'warning',
        title: isArabic ? 'انتهت الجلسة' : 'Session Expired',
        text: isArabic ? 'انتهت صلاحية تسجيل الدخول، يرجى تسجيل الدخول مرة أخرى للمتابعة.' : 'Your session has expired. Please log in again to continue.',
        confirmButtonText: isArabic ? 'حسناً' : 'OK',
        confirmButtonColor: '#10b981'
      });
    }

    if (redirectUrl) {
      this.router.navigate([redirectUrl]);
    }
  }
}
