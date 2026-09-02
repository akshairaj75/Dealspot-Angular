import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notifications-crud',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './notifications-crud.component.html',
  styleUrls: ['./notifications-crud.component.css']
})
export class NotificationsCrudComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  notifications = signal<NotificationItem[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(false);
  sending = signal<boolean>(false);

  // Filters
  searchQuery = '';
  typeFilter = '';
  channelFilter = '';
  statusFilter: string = '';
  currentPage = 0;
  pageSize = 15;
  totalPages = 0;

  // Modals
  isBroadcastModalOpen = signal<boolean>(false);
  broadcastForm!: FormGroup;

  // Enums for dropdowns
  typeOptions = [
    { value: 'OFFER_EXPIRY', labelEn: 'Offer Expiry Alert', labelAr: 'تنبيه انتهاء العرض' },
    { value: 'PRICE_DROP', labelEn: 'Price Drop', labelAr: 'تخفيض في السعر' },
    { value: 'NEW_FLYER', labelEn: 'New Flyer Release', labelAr: 'مجلة عروض جديدة' },
    { value: 'FLASH_DEAL', labelEn: 'Flash Deal Announcement', labelAr: 'عرض خاص محدود' },
    { value: 'STORE_OFFER', labelEn: 'Store New Offer', labelAr: 'عرض جديد من متجر' },
    { value: 'COUPON_ALERT', labelEn: 'Coupon & Promo Code', labelAr: 'كوبون ورمز خصم' },
    { value: 'PRODUCT_ALERT', labelEn: 'Product Alert', labelAr: 'تنبيه منتج' },
    { value: 'SYSTEM', labelEn: 'System Announcement', labelAr: 'إعلان من النظام' }
  ];

  channelOptions = [
    { value: 'PUSH', labelEn: 'Push Notification', labelAr: 'إشعار فوري (Push)' },
    { value: 'EMAIL', labelEn: 'Email Notification', labelAr: 'بريد إلكتروني' },
    { value: 'SMS', labelEn: 'SMS Text Message', labelAr: 'رسالة نصية SMS' }
  ];

  refTypeOptions = [
    { value: 'OFFER', labelEn: 'Offer Reference', labelAr: 'عرض' },
    { value: 'FLYER', labelEn: 'Flyer Reference', labelAr: 'مجلة عروض' },
    { value: 'COUPON', labelEn: 'Coupon Reference', labelAr: 'كوبون' },
    { value: 'PRODUCT', labelEn: 'Product Reference', labelAr: 'منتج' },
    { value: 'SYSTEM', labelEn: 'General System', labelAr: 'عام' }
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadNotifications();
  }

  initForm(): void {
    this.broadcastForm = this.fb.group({
      titleEn: ['', [Validators.required, Validators.maxLength(200)]],
      titleAr: ['', [Validators.required, Validators.maxLength(200)]],
      bodyEn: [''],
      bodyAr: [''],
      type: ['FLASH_DEAL', Validators.required],
      channel: ['PUSH', Validators.required],
      refType: ['OFFER'],
      refId: [null],
      deepLink: [''],
      targetUserId: [null]
    });
  }

  loadNotifications(page: number = 0): void {
    this.loading.set(true);
    this.currentPage = page;

    const isReadBool = this.statusFilter === 'read' ? true : (this.statusFilter === 'unread' ? false : undefined);

    this.notificationService.getAllNotifications(
      this.currentPage,
      this.pageSize,
      this.searchQuery,
      this.typeFilter || undefined,
      this.channelFilter || undefined,
      isReadBool
    ).subscribe({
      next: (res) => {
        this.notifications.set(res?.content || []);
        this.totalCount.set(res?.totalElements || 0);
        this.totalPages = res?.totalPages || 0;
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadNotifications(0);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.typeFilter = '';
    this.channelFilter = '';
    this.statusFilter = '';
    this.loadNotifications(0);
  }

  openBroadcastModal(): void {
    this.broadcastForm.reset({
      type: 'FLASH_DEAL',
      channel: 'PUSH',
      refType: 'OFFER'
    });
    this.isBroadcastModalOpen.set(true);
  }

  closeBroadcastModal(): void {
    this.isBroadcastModalOpen.set(false);
  }

  onSubmitBroadcast(): void {
    if (this.broadcastForm.invalid) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    const val = this.broadcastForm.value;

    this.notificationService.broadcastNotification(val).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.closeBroadcastModal();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Broadcast Sent!' : 'تم إرسال الإشعار!',
          text: this.currentLang() === 'en'
            ? `Successfully delivered notification to ${res?.sentCount || 'all'} user(s).`
            : `تم إرسال الإشعار بنجاح إلى ${res?.sentCount || 'جميع'} مستخدم.`,
          timer: 2500,
          showConfirmButton: false
        });
        this.loadNotifications(0);
      },
      error: (err) => {
        this.sending.set(false);
        console.error('Broadcast failed:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Broadcast Failed' : 'فشل إرسال الإشعار',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Something went wrong.' : 'حدث خطأ أثناء الإرسال.')
        });
      }
    });
  }

  onDelete(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Notification Log?' : 'حذف سجل الإشعار؟',
      text: this.currentLang() === 'en' ? 'This notification record will be permanently removed.' : 'سيتم حذف هذا السجل نهائياً.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete' : 'نعم، احذف',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((res) => {
      if (res.isConfirmed) {
        this.notificationService.deleteNotification(id).subscribe({
          next: () => {
            this.notifications.update(list => list.filter(n => n.id !== id));
            this.totalCount.update(c => Math.max(0, c - 1));
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted' : 'تم الحذف',
              toast: true,
              position: 'top-end',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => console.error('Delete failed:', err)
        });
      }
    });
  }

  getTypeBadge(type: string): string {
    switch (type) {
      case 'FLASH_DEAL': return 'badge-flash';
      case 'PRICE_DROP': return 'badge-price';
      case 'OFFER_EXPIRY': return 'badge-expiry';
      case 'NEW_FLYER': return 'badge-flyer';
      case 'COUPON_ALERT': return 'badge-coupon';
      default: return 'badge-system';
    }
  }

  getChannelIcon(channel: string): string {
    switch (channel) {
      case 'PUSH': return 'notifications_active';
      case 'EMAIL': return 'email';
      case 'SMS': return 'sms';
      default: return 'campaign';
    }
  }
}
