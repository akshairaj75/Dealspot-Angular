import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface AdminUserResponseDto {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone: string;
}

export interface AuditLogResponseDto {
  auditLogId: number;
  entityType: string;
  entityId: number;
  performedBy: AdminUserResponseDto | null;
  payload: string;
  action: string;
  ipAddress: string;
  createdAt: string;
}

export interface RecentActivityDto {
  auditLogId?: number;
  activityId?: number;
  title?: string;
  message?: string;
  description?: string;
  action?: string;
  entityType?: string;
  performedBy?: string;
  color?: string;
  createdAt?: string;
  timestamp?: string;
}

export interface AuditLogFilterDto {
  entityType?: string;
  action?: string;
  performedById?: number;
  startDate?: string;
  endDate?: string;
  searchKeyword?: string;
  page: number;
  size: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/audit-logs`;

  getPagedLogs(filter: AuditLogFilterDto): Observable<Page<AuditLogResponseDto>> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('size', filter.size.toString());

    if (filter.entityType) params = params.set('entityType', filter.entityType);
    if (filter.action) params = params.set('action', filter.action);
    if (filter.performedById) params = params.set('performedById', filter.performedById.toString());
    if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate);
    if (filter.searchKeyword) params = params.set('searchKeyword', filter.searchKeyword);

    return this.http.get<Page<AuditLogResponseDto>>(this.apiUrl, { params });
  }

  getRecentActivities(): Observable<RecentActivityDto[]> {
    return this.http.get<RecentActivityDto[]>(`${this.apiUrl}/recent`);
  }

  getLogsByEntity(entityType: string, entityId: number): Observable<AuditLogResponseDto[]> {
    return this.http.get<AuditLogResponseDto[]>(`${this.apiUrl}/entity/${entityType}/${entityId}`);
  }

  getLogsByUser(userId: number): Observable<AuditLogResponseDto[]> {
    return this.http.get<AuditLogResponseDto[]>(`${this.apiUrl}/user/${userId}`);
  }
}
