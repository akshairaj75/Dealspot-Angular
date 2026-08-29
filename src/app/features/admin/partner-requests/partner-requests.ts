import { Component, inject, OnInit, signal, computed, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerRequestService, PartnerRequestItem } from '../../../core/services/partner-request.service';
import { TranslationService } from '../../../core/services/translation.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-requests.html',
  styleUrls: ['./partner-requests.css']
})
export class PartnerRequestsComponent implements OnInit {
  private partnerService = inject(PartnerRequestService);
  private cd = inject(ChangeDetectorRef);
  translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  allRequests = signal<PartnerRequestItem[]>([]);
  requests = signal<PartnerRequestItem[]>([]);
  loading = signal(false);
  activeTab = signal<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  viewMode = signal<'GRID' | 'TABLE'>('GRID'); // Default is modern mobile-friendly Grid Cards
  searchQuery = '';
  copiedCrId = signal<number | null>(null);
  openMenuId = signal<number | null>(null); // Hamburger / 3-dots Quick Action Menu

  selectedRequest: PartnerRequestItem | null = null;
  isDetailModalOpen = signal(false);

  // Summary Metrics
  pendingCount = computed(() => this.allRequests().filter(r => r.status === 'PENDING').length);
  approvedCount = computed(() => this.allRequests().filter(r => r.status === 'APPROVED').length);
  rejectedCount = computed(() => this.allRequests().filter(r => r.status === 'REJECTED').length);
  totalCount = computed(() => this.allRequests().length);

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openMenuId() !== null) {
      this.openMenuId.set(null);
    }
  }

  toggleCardMenu(id: number, event: Event): void {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(id);
    }
  }

  closeCardMenu(): void {
    this.openMenuId.set(null);
  }

  ngOnInit(): void {
    this.loadAllRequestsForStats();
    this.loadRequests();
  }

  loadAllRequestsForStats(): void {
    this.partnerService.getAllRequests().subscribe({
      next: (data) => {
        this.allRequests.set(data || []);
      },
      error: (err) => console.error('Error loading summary stats:', err)
    });
  }

  loadRequests(): void {
    this.loading.set(true);
    const status = this.activeTab() === 'ALL' ? undefined : this.activeTab();

    this.partnerService.getAllRequests(status).subscribe({
      next: (data) => {
        this.requests.set(data || []);
        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading partner requests:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  setTab(tab: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'): void {
    this.activeTab.set(tab);
    this.loadRequests();
  }

  setViewMode(mode: 'GRID' | 'TABLE'): void {
    this.viewMode.set(mode);
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  copyCr(cr: string, id: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (!cr) return;
    navigator.clipboard.writeText(cr).then(() => {
      this.copiedCrId.set(id);
      setTimeout(() => this.copiedCrId.set(null), 2000);
    });
  }

  getFilteredRequests(): PartnerRequestItem[] {
    let list = this.requests();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.storeNameEn && r.storeNameEn.toLowerCase().includes(q)) ||
        (r.storeNameAr && r.storeNameAr.toLowerCase().includes(q)) ||
        (r.applicantName && r.applicantName.toLowerCase().includes(q)) ||
        (r.applicantEmail && r.applicantEmail.toLowerCase().includes(q)) ||
        (r.applicantPhone && r.applicantPhone.toLowerCase().includes(q)) ||
        (r.cityNameEn && r.cityNameEn.toLowerCase().includes(q)) ||
        (r.cityNameAr && r.cityNameAr.toLowerCase().includes(q)) ||
        (r.categoryNameEn && r.categoryNameEn.toLowerCase().includes(q)) ||
        (r.categoryNameAr && r.categoryNameAr.toLowerCase().includes(q)) ||
        (r.crNumber && r.crNumber.toLowerCase().includes(q)) ||
        (r.vatNumber && r.vatNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }

  viewDetails(req: PartnerRequestItem): void {
    this.selectedRequest = req;
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedRequest = null;
  }

  onApprove(req: PartnerRequestItem): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Approve Store Partner?' : 'اعتماد شريك المتجر؟',
      html: `<p>${this.currentLang() === 'en'
        ? `Are you sure you want to approve <b>${req.storeNameEn}</b>? This will automatically create the verified store and grant Store Manager access to <b>${req.applicantEmail}</b>.`
        : `هل أنت متأكد من اعتماد متجر <b>${req.storeNameAr}</b>؟ سيتم إنشاء المتجر وتفعيل صلاحية مدير المتجر للبريد <b>${req.applicantEmail}</b>.`}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1a6b3c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Approve & Provision Store' : 'نعم، اعتماد وإنشاء المتجر',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.approveRequest(req.id).subscribe({
          next: (approved) => {
            if (this.isDetailModalOpen()) this.closeDetailModal();
            this.loadRequests();
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Store Partner Approved!' : 'تم اعتماد المتجر بنجاح!',
              html: `<p>${this.currentLang() === 'en'
                ? `Store created (ID: #${approved.createdStoreId || approved.id}). Store Manager account activated for <b>${approved.applicantEmail}</b>.`
                : `تم إنشاء المتجر بنجاح وتفعيل حساب إدارة المتجر للمشرف <b>${approved.applicantEmail}</b>.`}</p>`,
              confirmButtonColor: '#1a6b3c'
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Approval Failed' : 'فشل الاعتماد',
              text: err.error?.message || 'Failed to approve partner request.'
            });
          }
        });
      }
    });
  }

  onReject(req: PartnerRequestItem): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Reject Partner Application' : 'رفض طلب الشراكة',
      input: 'textarea',
      inputLabel: this.currentLang() === 'en' ? 'Reason for Rejection' : 'سبب الرفض',
      inputPlaceholder: this.currentLang() === 'en' ? 'e.g. Commercial Registration (CR) is invalid or unreadable...' : 'مثال: السجل التجاري غير صالح أو غير مقروء...',
      inputAttributes: {
        'aria-label': 'Type your reason here'
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.currentLang() === 'en' ? 'Reject Application' : 'تأكيد الرفض',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.partnerService.rejectRequest(req.id, result.value).subscribe({
          next: () => {
            if (this.isDetailModalOpen()) this.closeDetailModal();
            this.loadRequests();
            Swal.fire({
              icon: 'info',
              title: this.currentLang() === 'en' ? 'Application Rejected' : 'تم رفض الطلب',
              text: this.currentLang() === 'en' ? 'Partner application has been rejected.' : 'تم تسجيل رفض طلب الشراكة.',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Action Failed' : 'فشل الإجراء',
              text: err.error?.message || 'Failed to reject application.'
            });
          }
        });
      }
    });
  }
}
