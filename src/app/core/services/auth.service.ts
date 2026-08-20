import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthUser {
  id: number | string;
  fullName: string;
  email: string;
  accountType: 'USER' | 'ADMIN' | string;
  role: string;
}

export interface AuthResponse {
  id: number;
  fullName: string;
  email: string;
  token: string;
  accountType: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl + '/auth';

  // State Signals
  currentUser = signal<AuthUser | null>(this.loadUserFromStorage());
  token = signal<string | null>(this.loadTokenFromStorage());

  // Computed state
  isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user || !this.token()) return false;
    const role = (user.role || '').toUpperCase();
    const accountType = (user.accountType || '').toUpperCase();
    return accountType === 'ADMIN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STORE_ADMIN';
  });

  private loadTokenFromStorage(): string | null {
    return localStorage.getItem('dealspot_token') || localStorage.getItem('token');
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem('dealspot_user') || localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveSession(res: AuthResponse): void {
    const user: AuthUser = {
      id: res.id,
      fullName: res.fullName,
      email: res.email,
      accountType: res.accountType || (res.role === 'USER' ? 'USER' : 'ADMIN'),
      role: res.role || 'USER'
    };

    localStorage.setItem('dealspot_token', res.token);
    localStorage.setItem('token', res.token);
    localStorage.setItem('dealspot_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    this.token.set(res.token);
    this.currentUser.set(user);
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

  logout(redirectUrl = '/login'): void {
    localStorage.removeItem('dealspot_token');
    localStorage.removeItem('token');
    localStorage.removeItem('dealspot_user');
    localStorage.removeItem('user');
    localStorage.removeItem('dealspot_admin_token');
    localStorage.removeItem('dealspot_admin_user');

    this.token.set(null);
    this.currentUser.set(null);

    this.router.navigate([redirectUrl]);
  }
}
