import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface NotificationItem {
  id: number;
  userId: number;
  userFullName?: string;
  userEmail?: string;
  type: string;
  channel: string;
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  refId?: number;
  refType?: string;
  deepLink?: string;
  read: boolean;
  sentAt: string;
  createdAt: string;
}

export interface BroadcastNotificationPayload {
  titleEn: string;
  titleAr: string;
  bodyEn?: string;
  bodyAr?: string;
  type?: string;
  channel?: string;
  refId?: number;
  refType?: string;
  deepLink?: string;
  targetUserId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl + '/notifications';

  unreadCount = signal<number>(0);
  recentNotifications = signal<NotificationItem[]>([]);

  constructor(private http: HttpClient) {}

  fetchUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(res => {
        this.unreadCount.set(res.unreadCount || 0);
      })
    );
  }

  getMyNotifications(page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(`${this.apiUrl}/my`, { params }).pipe(
      tap(res => {
        if (page === 0 && res?.content) {
          this.recentNotifications.set(res.content);
        }
      })
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.unreadCount.update(c => Math.max(0, c - 1));
        this.recentNotifications.update(list =>
          list.map(n => n.id === id ? { ...n, read: true } : n)
        );
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCount.set(0);
        this.recentNotifications.update(list =>
          list.map(n => ({ ...n, read: true }))
        );
      })
    );
  }

  getAllNotifications(
    page: number = 0,
    size: number = 20,
    search?: string,
    type?: string,
    channel?: string,
    isRead?: boolean
  ): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search && search.trim()) params = params.set('search', search.trim());
    if (type) params = params.set('type', type);
    if (channel) params = params.set('channel', channel);
    if (isRead !== undefined && isRead !== null) params = params.set('isRead', isRead);

    return this.http.get<any>(`${this.apiUrl}/all`, { params });
  }

  broadcastNotification(payload: BroadcastNotificationPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/broadcast`, payload);
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
