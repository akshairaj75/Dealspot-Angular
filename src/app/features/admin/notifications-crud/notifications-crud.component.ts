import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService, NotificationItem, BroadcastNotificationPayload } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { OfferService } from '../../../core/services/offer.service';
import { FlyerService } from '../../../core/services/flyer.service';
import { ProductService } from '../../../core/services/product.service';
import { CouponService } from '../../../core/services/coupon.service';
import { StoreService } from '../../../core/services/store.service';
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
  private offerService = inject(OfferService);
  private flyerService = inject(FlyerService);
  private productService = inject(ProductService);
  private couponService = inject(CouponService);
  private storeService = inject(StoreService);
  private fb = inject(FormBuilder);
  public translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  notifications = signal<NotificationItem[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(false);
  sending = signal<boolean>(false);

  // Dynamic entities for pickers
  offersList = signal<any[]>([]);
  flyersList = signal<any[]>([]);
  productsList = signal<any[]>([]);
  couponsList = signal<any[]>([]);
  storesList = signal<any[]>([]);
  loadingEntities = signal<boolean>(false);

  // Paginated Product Search (Loaded only when needed)
  productSearchQuery = signal<string>('');
  productPage = signal<number>(0);
  productTotalPages = signal<number>(0);
  productTotalElements = signal<number>(0);
  loadingProducts = signal<boolean>(false);
  pagedProductsList = signal<any[]>([]);
  selectedProductRaw = signal<any | null>(null);
  private productSearchDebounceTimer: any = null;

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
    { value: 'PRICE_DROP', labelEn: 'Price Drop Alert', labelAr: 'تخفيض في السعر' },
    { value: 'NEW_FLYER', labelEn: 'New Flyer Release', labelAr: 'مجلة عروض جديدة' },
    { value: 'FLASH_DEAL', labelEn: 'Flash Deal Announcement', labelAr: 'عرض خاص محدود' },
    { value: 'STORE_OFFER', labelEn: 'Store New Offer', labelAr: 'عرض جديد من متجر' },
    { value: 'COUPON_ALERT', labelEn: 'Coupon & Promo Code', labelAr: 'كوبون ورمز خصم' },
    { value: 'PRODUCT_ALERT', labelEn: 'Product Alert', labelAr: 'تنبيه منتج' },
    { value: 'SYSTEM', labelEn: 'System Announcement', labelAr: 'إعلان من النظام' }
  ];

  channelOptions = [
    { value: 'PUSH', labelEn: 'Push Notification (App & Web)', labelAr: 'إشعار فوري (تطبيق وموقع)' },
    { value: 'EMAIL', labelEn: 'Email Notification', labelAr: 'بريد إلكتروني' },
    { value: 'SMS', labelEn: 'SMS Text Message', labelAr: 'رسالة نصية SMS' }
  ];

  refTypeOptions = [
    { value: 'OFFER', labelEn: 'Related Offer', labelAr: 'عرض مرتبط' },
    { value: 'FLYER', labelEn: 'Related Flyer', labelAr: 'مجلة عروض مرتبطة' },
    { value: 'PRODUCT', labelEn: 'Related Product', labelAr: 'منتج مرتبط' },
    { value: 'COUPON', labelEn: 'Related Coupon', labelAr: 'كوبون مرتبط' },
    { value: 'SYSTEM', labelEn: 'General / No Entity', labelAr: 'عام / بدون ارتباط' }
  ];

  targetAudienceOptions = [
    { value: 'ALL', labelEn: 'All Registered Customers (Broadcast)', labelAr: 'كافة العملاء المسجلين (بث عام)' },
    { value: 'USER', labelEn: 'Specific User by ID', labelAr: 'مستخدم محدد بالمعرف' }
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
      targetAudience: ['ALL'],
      targetUserId: [null]
    });
  }

  // ── Lazy Load Entities on Demand ──────────────────────────────────
  loadOffers(): void {
    if (this.offersList().length > 0) return;
    this.loadingEntities.set(true);
    this.offerService.getAllOffers().subscribe({
      next: (res) => {
        const formatted = (res || []).map((o: any) => ({
          id: o.id,
          nameEn: `${o.titleEn || o.title || 'Offer #' + o.id} ${o.discountPercentage ? '(' + o.discountPercentage + '% Off)' : ''}`,
          nameAr: `${o.titleAr || o.title || 'عرض #' + o.id} ${o.discountPercentage ? '(خصم ' + o.discountPercentage + '%)' : ''}`,
          raw: o
        }));
        this.offersList.set(formatted);
        this.loadingEntities.set(false);
      },
      error: () => { this.loadingEntities.set(false); }
    });
  }

  loadFlyers(): void {
    if (this.flyersList().length > 0) return;
    this.loadingEntities.set(true);
    this.flyerService.getAllFlyers().subscribe({
      next: (res) => {
        const formatted = (res || []).map((f: any) => ({
          id: f.id,
          nameEn: f.titleEn || f.title || `Flyer #${f.id}`,
          nameAr: f.titleAr || f.title || `مجلة #${f.id}`,
          raw: f
        }));
        this.flyersList.set(formatted);
        this.loadingEntities.set(false);
      },
      error: () => { this.loadingEntities.set(false); }
    });
  }

  loadCoupons(): void {
    if (this.couponsList().length > 0) return;
    this.loadingEntities.set(true);
    this.couponService.getAllCoupons().subscribe({
      next: (res) => {
        const formatted = (res || []).map((c: any) => ({
          id: c.id,
          nameEn: `${c.code || 'COUPON'} - ${c.titleEn || c.nameEn || c.discountValue + '% Off'}`,
          nameAr: `${c.code || 'كوبون'} - ${c.titleAr || c.nameAr || 'خصم ' + c.discountValue + '%'}`,
          raw: c
        }));
        this.couponsList.set(formatted);
        this.loadingEntities.set(false);
      },
      error: () => { this.loadingEntities.set(false); }
    });
  }

  // ── Paginated Product Search Methods ──────────────────────────────
  onProductSearchChange(query: string): void {
    this.productSearchQuery.set(query);
    if (this.productSearchDebounceTimer) {
      clearTimeout(this.productSearchDebounceTimer);
    }
    this.productSearchDebounceTimer = setTimeout(() => {
      this.searchProducts(0);
    }, 300);
  }

  clearProductSearch(): void {
    this.productSearchQuery.set('');
    this.searchProducts(0);
  }

  searchProducts(page: number = 0): void {
    this.productPage.set(page);
    this.loadingProducts.set(true);
    const query = this.productSearchQuery();

    this.productService.getPagedProducts(page, 8, query).subscribe({
      next: (res) => {
        const items = res.content || [];
        const formatted = items.map((p: any) => ({
          id: p.id,
          nameEn: `${p.nameEn || p.name_en || 'Product #' + p.id} ${p.brand ? '[' + p.brand + ']' : ''}`,
          nameAr: `${p.nameAr || p.name_ar || 'منتج #' + p.id} ${p.brand ? '[' + p.brand + ']' : ''}`,
          raw: p
        }));
        this.pagedProductsList.set(formatted);
        this.productTotalPages.set(res.totalPages || 0);
        this.productTotalElements.set(res.totalElements || 0);
        this.loadingProducts.set(false);
      },
      error: () => {
        this.loadingProducts.set(false);
      }
    });
  }

  selectProduct(product: any): void {
    this.broadcastForm.patchValue({
      refId: product.id,
      deepLink: `/products/${product.id}`
    });
    this.selectedProductRaw.set(product.raw);
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
      refType: 'OFFER',
      refId: null,
      deepLink: '',
      targetAudience: 'ALL',
      targetUserId: null
    });
    this.selectedProductRaw.set(null);
    this.isBroadcastModalOpen.set(true);
    this.loadOffers();
  }

  closeBroadcastModal(): void {
    this.isBroadcastModalOpen.set(false);
  }

  onRefTypeChange(refType: any): void {
    this.broadcastForm.patchValue({ refId: null, deepLink: '' });
    this.selectedProductRaw.set(null);

    switch (refType) {
      case 'OFFER':
        this.broadcastForm.patchValue({ type: 'FLASH_DEAL', deepLink: '/offers' });
        this.loadOffers();
        break;
      case 'FLYER':
        this.broadcastForm.patchValue({ type: 'NEW_FLYER', deepLink: '/flyers' });
        this.loadFlyers();
        break;
      case 'PRODUCT':
        this.broadcastForm.patchValue({ type: 'PRODUCT_ALERT', deepLink: '/products' });
        if (this.pagedProductsList().length === 0) {
          this.searchProducts(0);
        }
        break;
      case 'COUPON':
        this.broadcastForm.patchValue({ type: 'COUPON_ALERT', deepLink: '/coupons' });
        this.loadCoupons();
        break;
      default:
        this.broadcastForm.patchValue({ type: 'SYSTEM', deepLink: '' });
        break;
    }
  }

  onEntitySelect(entityId: any): void {
    if (!entityId) return;
    const refType = this.broadcastForm.get('refType')?.value;

    if (refType === 'OFFER') {
      this.broadcastForm.patchValue({ deepLink: `/offers/${entityId}` });
    } else if (refType === 'FLYER') {
      this.broadcastForm.patchValue({ deepLink: `/flyers/${entityId}` });
    } else if (refType === 'PRODUCT') {
      this.broadcastForm.patchValue({ deepLink: `/products/${entityId}` });
    } else if (refType === 'COUPON') {
      this.broadcastForm.patchValue({ deepLink: `/coupons` });
    }
  }

  autoFillFromEntity(): void {
    const refType = this.broadcastForm.get('refType')?.value;
    const refId = this.broadcastForm.get('refId')?.value;

    if (!refId) {
      Swal.fire({
        icon: 'info',
        title: this.currentLang() === 'en' ? 'Select an item first' : 'اختر عنصراً أولاً',
        text: this.currentLang() === 'en' ? 'Please choose a specific item from the dropdown to auto-generate content.' : 'يرجى اختيار عنصر محدد من القائمة لإنشاء النص تلقائياً.'
      });
      return;
    }

    if (refType === 'OFFER') {
      const found = this.offersList().find(o => o.id === Number(refId));
      if (found?.raw) {
        const o = found.raw;
        const titleEn = `🔥 Hot Deal: ${o.titleEn || o.title || 'Special Promotion'}`;
        const titleAr = `🔥 عرض خاص: ${o.titleAr || o.title || 'تخفيض حصري'}`;
        const bodyEn = `Exclusive price of ${o.offerPrice || o.price || ''} SAR on ${o.titleEn || 'this item'}! Limited time deal, tap to explore.`;
        const bodyAr = `سعر مميز يبدأ من ${o.offerPrice || o.price || ''} ريال على ${o.titleAr || o.titleEn || 'هذا المنتج'}! لفترة محدودة، اضغط للتفاصيل.`;
        this.broadcastForm.patchValue({ titleEn, titleAr, bodyEn, bodyAr, deepLink: `/offers/${refId}` });
      }
    } else if (refType === 'FLYER') {
      const found = this.flyersList().find(f => f.id === Number(refId));
      if (found?.raw) {
        const f = found.raw;
        const titleEn = `📰 New Flyer: ${f.titleEn || f.title || 'Latest Catalog'}`;
        const titleAr = `📰 مجلة عروض جديدة: ${f.titleAr || f.title || 'أحدث مجلة عروض'}`;
        const bodyEn = `Explore the latest promotion flyer and save big on your weekly groceries!`;
        const bodyAr = `تصفح أحدث مجلات العروض ووفر في مشترياتك اليومية والأسبوعية!`;
        this.broadcastForm.patchValue({ titleEn, titleAr, bodyEn, bodyAr, deepLink: `/flyers/${refId}` });
      }
    } else if (refType === 'PRODUCT') {
      const p = this.selectedProductRaw() || this.pagedProductsList().find(p => p.id === Number(refId))?.raw;
      if (p) {
        const titleEn = `⭐ Price Alert: ${p.nameEn || p.name_en || 'Featured Product'}`;
        const titleAr = `⭐ تنبيه سعر: ${p.nameAr || p.name_ar || 'منتج مميز'}`;
        const bodyEn = `Check out the best available deals for ${p.nameEn || 'this product'} across stores near you.`;
        const bodyAr = `اكتشف أفضل العروض والأسعار لمنتج ${p.nameAr || p.nameEn || ''} في المتاجر القريبة منك.`;
        this.broadcastForm.patchValue({ titleEn, titleAr, bodyEn, bodyAr, deepLink: `/products/${refId}` });
      }
    } else if (refType === 'COUPON') {
      const found = this.couponsList().find(c => c.id === Number(refId));
      if (found?.raw) {
        const c = found.raw;
        const titleEn = `🎟️ Promo Code: ${c.code || 'SAVE'}`;
        const titleAr = `🎟️ كود خصم جديد: ${c.code || 'توفير'}`;
        const bodyEn = `Use discount coupon code ${c.code} for instant extra savings at checkout!`;
        const bodyAr = `استخدم كود الخصم ${c.code} للحصول على توفير فوري إضافي عند الدفع!`;
        this.broadcastForm.patchValue({ titleEn, titleAr, bodyEn, bodyAr, deepLink: `/coupons` });
      }
    }

    Swal.fire({
      icon: 'success',
      title: this.currentLang() === 'en' ? 'Auto-Filled!' : 'تم التعبئة التلقائية!',
      toast: true,
      position: 'top-end',
      timer: 1500,
      showConfirmButton: false
    });
  }

  onSubmitBroadcast(): void {
    if (this.broadcastForm.invalid) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    const val = this.broadcastForm.value;

    const payload: BroadcastNotificationPayload = {
      titleEn: val.titleEn,
      titleAr: val.titleAr,
      bodyEn: val.bodyEn || null,
      bodyAr: val.bodyAr || null,
      type: val.type,
      channel: val.channel,
      refType: val.refType || null,
      refId: val.refId ? Number(val.refId) : null,
      deepLink: val.deepLink || null,
      targetUserId: val.targetAudience === 'USER' && val.targetUserId ? Number(val.targetUserId) : null
    };

    this.notificationService.broadcastNotification(payload).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.closeBroadcastModal();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Notification Sent!' : 'تم إرسال الإشعار!',
          text: this.currentLang() === 'en'
            ? `Successfully delivered to ${res?.sentCount || 'all'} recipient(s).`
            : `تم إرسال الإشعار بنجاح إلى ${res?.sentCount || 'كافة'} المستلمين.`,
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
          title: this.currentLang() === 'en' ? 'Send Failed' : 'فشل الإرسال',
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
