import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuditLogService, RecentActivityDto } from '../../../core/services/audit-log.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private auditLogService = inject(AuditLogService);

  currentLang = this.translationService.currentLang;
  currentUser = this.authService.currentUser;
  recentActivities: RecentActivityDto[] = [];

  ngOnInit(): void {
    const role = this.currentUser()?.role;
    if (role === 'SUPER_ADMIN' || role === 'STORE_MANAGER' || role === 'CONTENT_MANAGER') {
      this.auditLogService.getRecentActivities().subscribe({
        next: (activities) => {
          this.recentActivities = activities;
        },
        error: (err) => console.error('Failed to load recent activities', err)
      });
    }
  }

  get userRoleLabel(): string {
    const role = (this.currentUser()?.role || '').toUpperCase();
    if (this.currentLang() === 'ar') {
      if (role === 'SUPER_ADMIN') return 'المدير العام';
      if (role === 'STORE_MANAGER') return 'مدير المتجر';
      return 'المشرف';
    } else {
      if (role === 'SUPER_ADMIN') return 'Super Administrator';
      if (role === 'STORE_MANAGER') return 'Store Manager';
      return 'Administrator';
    }
  }
}


