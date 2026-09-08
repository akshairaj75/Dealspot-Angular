import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService, AuditLogFilterDto, AuditLogResponseDto, Page } from '../../../core/services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.css']
})
export class AuditLogsComponent implements OnInit {
  private auditLogService = inject(AuditLogService);

  logs: AuditLogResponseDto[] = [];
  totalElements = 0;
  totalPages = 0;
  
  filter: AuditLogFilterDto = {
    page: 0,
    size: 20,
    entityType: '',
    action: '',
    searchKeyword: ''
  };

  loading = false;

  actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'BULK_EXPIRE'];
  entityTypes = [
    { label: 'Offer', value: 'OFFER' },
    { label: 'Product', value: 'PRODUCT' },
    { label: 'Brand', value: 'BRAND' },
    { label: 'Store', value: 'STORE' },
    { label: 'Store Branch', value: 'STORE_BRANCH' },
    { label: 'Category', value: 'CATEGORY' },
    { label: 'Coupon Code', value: 'COUPON_CODE' },
    { label: 'Flyer', value: 'FLYER' },
    { label: 'Partner Request', value: 'PARTNER_REQUEST' },
    { label: 'Admin User', value: 'ADMIN_USER' },
    { label: 'City', value: 'CITY' }
  ];

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.auditLogService.getPagedLogs(this.filter).subscribe({
      next: (page) => {
        this.logs = page.content;
        this.totalElements = page.totalElements;
        this.totalPages = page.totalPages;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading audit logs', err);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.filter.page = 0;
    this.loadLogs();
  }

  onPageChange(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.filter.page = newPage;
      this.loadLogs();
    }
  }

  formatPayload(payload: string): any {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
}
