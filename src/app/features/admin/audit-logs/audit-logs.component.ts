import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService, AuditLogFilterDto, AuditLogResponseDto } from '../../../core/services/audit-log.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.css']
})
export class AuditLogsComponent implements OnInit {
  private auditLogService = inject(AuditLogService);
  private translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  // Reactive State
  logs = signal<AuditLogResponseDto[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  loading = signal<boolean>(false);
  selectedLog = signal<AuditLogResponseDto | null>(null);
  copiedLabel = signal<string | null>(null);
  copiedField = signal<string | null>(null);
  activeModalTab = signal<'overview' | 'payload' | 'error'>('overview');

  // Filter state
  filter: AuditLogFilterDto = {
    page: 0,
    size: 20,
    entityType: '',
    action: '',
    searchKeyword: '',
    startDate: '',
    endDate: ''
  };

  // Metrics derived from loaded logs and total count
  totalCount = computed(() => this.totalElements());

  successCount = computed(() => {
    return this.logs().filter(l => l.success !== false && (!l.statusCode || l.statusCode < 400)).length;
  });

  errorCount = computed(() => {
    return this.logs().filter(l => l.success === false || (l.statusCode && l.statusCode >= 400)).length;
  });

  avgDuration = computed(() => {
    const validLogs = this.logs().filter(l => typeof l.durationMs === 'number' && l.durationMs > 0);
    if (validLogs.length === 0) return 0;
    const sum = validLogs.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
    return Math.round(sum / validLogs.length);
  });

  actions = [
    { id: 'CREATE', nameEn: 'CREATE', nameAr: 'إنشاء (CREATE)', icon: 'add_circle' },
    { id: 'UPDATE', nameEn: 'UPDATE', nameAr: 'تحديث (UPDATE)', icon: 'edit' },
    { id: 'DELETE', nameEn: 'DELETE', nameAr: 'حذف (DELETE)', icon: 'delete' },
    { id: 'APPROVE', nameEn: 'APPROVE', nameAr: 'موافقة (APPROVE)', icon: 'check_circle' },
    { id: 'REJECT', nameEn: 'REJECT', nameAr: 'رفض (REJECT)', icon: 'cancel' },
    { id: 'BULK_EXPIRE', nameEn: 'BULK_EXPIRE', nameAr: 'إنهاء جماعي (BULK_EXPIRE)', icon: 'timer_off' },
    { id: 'LOGIN', nameEn: 'LOGIN', nameAr: 'تسجيل دخول (LOGIN)', icon: 'login' },
    { id: 'LOGOUT', nameEn: 'LOGOUT', nameAr: 'تسجيل خروج (LOGOUT)', icon: 'logout' },
    { id: 'SYSTEM_EVENT', nameEn: 'SYSTEM_EVENT', nameAr: 'حدث نظام (SYSTEM_EVENT)', icon: 'bolt' }
  ];

  entityTypes = [
    { id: 'OFFER', nameEn: 'Offer', nameAr: 'العروض (Offer)', icon: 'local_offer' },
    { id: 'PRODUCT', nameEn: 'Product', nameAr: 'المنتجات (Product)', icon: 'shopping_bag' },
    { id: 'BRAND', nameEn: 'Brand', nameAr: 'الماركات (Brand)', icon: 'loyalty' },
    { id: 'STORE', nameEn: 'Store', nameAr: 'المتاجر (Store)', icon: 'store' },
    { id: 'STORE_BRANCH', nameEn: 'Store Branch', nameAr: 'فروع المتاجر (Branch)', icon: 'storefront' },
    { id: 'CATEGORY', nameEn: 'Category', nameAr: 'الأقسام (Category)', icon: 'category' },
    { id: 'COUPON_CODE', nameEn: 'Coupon Code', nameAr: 'الكوبونات (Coupon)', icon: 'confirmation_number' },
    { id: 'FLYER', nameEn: 'Flyer', nameAr: 'المنشورات (Flyer)', icon: 'menu_book' },
    { id: 'PARTNER_REQUEST', nameEn: 'Partner Request', nameAr: 'طلبات الشراكة (Partner Req)', icon: 'handshake' },
    { id: 'ADMIN_USER', nameEn: 'Admin User', nameAr: 'المشرفين (Admin User)', icon: 'people' },
    { id: 'CITY', nameEn: 'City', nameAr: 'المدن (City)', icon: 'place' },
    { id: 'SAVED_OFFER', nameEn: 'Saved Offer', nameAr: 'العروض المحفوظة (Saved Offer)', icon: 'bookmark' },
    { id: 'STORE_FOLLOW', nameEn: 'Store Follow', nameAr: 'متابعة المتاجر (Store Follow)', icon: 'favorite' },
    { id: 'HTTP_REQUEST', nameEn: 'HTTP Request', nameAr: 'طلبات HTTP (HTTP Request)', icon: 'http' }
  ];

  pageSizeList = [
    { id: 10, nameEn: '10 per page', nameAr: '10 لكل صفحة' },
    { id: 20, nameEn: '20 per page', nameAr: '20 لكل صفحة' },
    { id: 50, nameEn: '50 per page', nameAr: '50 لكل صفحة' },
    { id: 100, nameEn: '100 per page', nameAr: '100 لكل صفحة' }
  ];

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);

    // Format dates to ISO if user picked date string (YYYY-MM-DD)
    const filterCopy: AuditLogFilterDto = {
      ...this.filter,
      startDate: this.filter.startDate ? `${this.filter.startDate}T00:00:00` : undefined,
      endDate: this.filter.endDate ? `${this.filter.endDate}T23:59:59` : undefined
    };

    this.auditLogService.getPagedLogs(filterCopy).subscribe({
      next: (page) => {
        this.logs.set(page.content || []);
        this.totalElements.set(page.totalElements || 0);
        this.totalPages.set(page.totalPages || 0);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading audit logs', err);
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.filter.page = 0;
    this.loadLogs();
  }

  resetFilters(): void {
    this.filter = {
      page: 0,
      size: 20,
      entityType: '',
      action: '',
      searchKeyword: '',
      startDate: '',
      endDate: ''
    };
    this.loadLogs();
  }

  onPageChange(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.filter.page = newPage;
      this.loadLogs();
    }
  }

  onPageSizeChange(newSize: any): void {
    this.filter.size = Number(newSize || 20);
    this.filter.page = 0;
    this.loadLogs();
  }

  openDetailModal(log: AuditLogResponseDto): void {
    this.selectedLog.set(log);
    if (this.hasError(log)) {
      this.activeModalTab.set('overview');
    } else if (this.hasPayload(log)) {
      this.activeModalTab.set('overview');
    } else {
      this.activeModalTab.set('overview');
    }
  }

  closeDetailModal(): void {
    this.selectedLog.set(null);
  }

  setModalTab(tab: 'overview' | 'payload' | 'error'): void {
    this.activeModalTab.set(tab);
  }

  hasError(log?: AuditLogResponseDto | null): boolean {
    if (!log) return false;
    return log.success === false || (!!log.statusCode && log.statusCode >= 400) || !!log.errorMessage || !!log.errorType;
  }

  hasPayload(log?: AuditLogResponseDto | null): boolean {
    if (!log || !log.payload) return false;
    return log.payload.trim().length > 0 && log.payload.trim() !== '{}' && log.payload.trim() !== 'null';
  }

  getStatusText(statusCode?: number, success?: boolean): string {
    if (statusCode) {
      switch (statusCode) {
        case 200: return '200 OK';
        case 201: return '201 Created';
        case 204: return '204 No Content';
        case 400: return '400 Bad Request';
        case 401: return '401 Unauthorized';
        case 403: return '403 Forbidden';
        case 404: return '404 Not Found';
        case 409: return '409 Conflict';
        case 422: return '422 Unprocessable';
        case 500: return '500 Server Error';
        case 502: return '502 Bad Gateway';
        case 503: return '503 Unavailable';
        default: return `${statusCode}`;
      }
    }
    if (success === true) return '200 OK';
    if (success === false) return 'FAILED';
    return 'UNKNOWN';
  }

  copyToClipboard(text?: string | number | null, label: string = 'Copied', fieldId?: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (text === null || text === undefined || text === '') return;
    const stringText = String(text);

    const notifySuccess = () => {
      this.copiedLabel.set(label);
      if (fieldId) {
        this.copiedField.set(fieldId);
      }
      setTimeout(() => {
        if (this.copiedLabel() === label) {
          this.copiedLabel.set(null);
        }
        if (fieldId && this.copiedField() === fieldId) {
          this.copiedField.set(null);
        }
      }, 2000);
    };

    if (navigator?.clipboard?.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(stringText)
        .then(() => notifySuccess())
        .catch(() => this.fallbackCopy(stringText, notifySuccess));
    } else {
      this.fallbackCopy(stringText, notifySuccess);
    }
  }

  private fallbackCopy(stringText: string, notifySuccess: () => void): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = stringText;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        notifySuccess();
      }
    } catch (err) {
      console.error('Clipboard copy error', err);
    }
  }

  formatPayloadJson(payload?: string): string {
    if (!payload) return '';
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return payload;
    }
  }

  getPayloadKeyCount(payload?: string): number {
    if (!payload) return 0;
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.keys(parsed).length;
      }
      return 1;
    } catch {
      return 1;
    }
  }

  getMethodBadgeClass(method?: string): string {
    if (!method) return 'badge-method-default';
    switch (method.toUpperCase()) {
      case 'GET': return 'badge-get';
      case 'POST': return 'badge-post';
      case 'PUT': return 'badge-put';
      case 'PATCH': return 'badge-patch';
      case 'DELETE': return 'badge-delete';
      default: return 'badge-method-default';
    }
  }

  getStatusBadgeClass(statusCode?: number, success?: boolean): string {
    if (statusCode) {
      if (statusCode >= 200 && statusCode < 300) return 'status-badge-2xx';
      if (statusCode >= 300 && statusCode < 400) return 'status-badge-3xx';
      if (statusCode >= 400 && statusCode < 500) return 'status-badge-4xx';
      if (statusCode >= 500) return 'status-badge-5xx';
    }
    if (success === true) return 'status-badge-2xx';
    if (success === false) return 'status-badge-5xx';
    return 'status-badge-default';
  }

  getActionBadgeClass(action?: string): string {
    if (!action) return 'action-badge-default';
    const normalized = action.toUpperCase();
    if (normalized.includes('CREATE') || normalized.includes('REGISTER')) return 'action-badge-create';
    if (normalized.includes('UPDATE') || normalized.includes('EDIT')) return 'action-badge-update';
    if (normalized.includes('DELETE') || normalized.includes('REMOVE')) return 'action-badge-delete';
    if (normalized.includes('APPROVE')) return 'action-badge-approve';
    if (normalized.includes('REJECT')) return 'action-badge-reject';
    if (normalized.includes('LOGIN')) return 'action-badge-login';
    if (normalized.includes('LOGOUT')) return 'action-badge-logout';
    if (normalized.includes('BULK')) return 'action-badge-bulk';
    return 'action-badge-default';
  }

  getDurationClass(durationMs?: number): string {
    if (!durationMs && durationMs !== 0) return '';
    if (durationMs < 100) return 'duration-fast';
    if (durationMs < 500) return 'duration-medium';
    return 'duration-slow';
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.filter.page;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      let start = Math.max(1, current - 2);
      let end = Math.min(total - 2, current + 2);

      if (start > 1) pages.push(-1); // ellipsis
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < total - 2) pages.push(-2); // ellipsis
      pages.push(total - 1);
    }
    return pages;
  }
}
