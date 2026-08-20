import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CONTENT_MANAGER' | 'SUPPORT' | 'ANALYST';
  active: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/admin/users';

  getAdmins(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/fetch-all`);
  }

  createAdmin(data: CreateAdminRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/create`, data);
  }

  toggleAdminStatus(id: number): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/toggle/${id}`, {});
  }

  deleteAdmin(id: number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`, { responseType: 'text' });
  }
}
