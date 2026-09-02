import { RouterLink } from '@angular/router';
import { Component, inject, OnInit, AfterViewInit, OnDestroy, signal, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OfferService } from '../../../core/services/offer.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CityService } from '../../../core/services/city.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-offers-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, RouterLink],
  templateUrl: './offers-crud.component.html',
  styleUrl: './offers-crud.component.css'
})
export class OffersCrudComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);

  badgeTypeOptions = [
    { id: 'NONE', nameEn: 'Standard (NONE)', nameAr: 'عادي (بدون شارة)' },
    { id: 'PERCENT_OFF', nameEn: 'Percentage Off (PERCENT_OFF)', nameAr: 'نسبة خصم (PERCENT_OFF)' },
    { id: 'FLASH', nameEn: 'Flash Deal (FLASH)', nameAr: 'صفقة خاطفة (FLASH)' },
    { id: 'NEW', nameEn: 'New Arrival (NEW)', nameAr: 'جديد (NEW)' },
    { id: 'BOGO', nameEn: 'Buy 1 Get 1 (BOGO)', nameAr: 'اشتر 1 واحصل على 1 (BOGO)' },
    { id: 'CLEARANCE', nameEn: 'Clearance (CLEARANCE)', nameAr: 'تصفية (CLEARANCE)' },
    { id: 'COUPON', nameEn: 'Coupon Deal (COUPON)', nameAr: 'عرض كوبون (COUPON)' },
    { id: 'FEATURED', nameEn: 'Featured Deal (FEATURED)', nameAr: 'عرض مميز (FEATURED)' },
    { id: 'PROMO', nameEn: 'Special Promo (PROMO)', nameAr: 'عرض ترويجي (PROMO)' }
  ];

  badgeFilterOptions = [
    { id: 'NONE', nameEn: 'NONE', nameAr: 'بدون' },
    { id: 'FEATURED', nameEn: 'FEATURED', nameAr: 'مميز' },
    { id: 'FLASH', nameEn: 'FLASH', nameAr: 'خاطف' },
    { id: 'BOGO', nameEn: 'BOGO', nameAr: 'BOGO' },
    { id: 'PROMO', nameEn: 'PROMO', nameAr: 'ترويجي' }
  ];

  statusFilterOptions = [
    { id: '', nameEn: 'All Statuses', nameAr: 'جميع الحالات' },
    { id: 'ACTIVE', nameEn: 'Active Only', nameAr: 'نشط فقط' },
    { id: 'EXPIRED', nameEn: 'Expired Only', nameAr: 'منتهي فقط' },
    { id: 'UPCOMING', nameEn: 'Upcoming Only', nameAr: 'قادم فقط' },
    { id: 'DISABLED', nameEn: 'Disabled', nameAr: 'معطل' }
  ];
  private offerService = inject(OfferService);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cityService = inject(CityService);
  public authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  offers = signal<any[]>([]);
  stores = signal<any[]>([]);
  categories = signal<any[]>([]);
  cities = signal<any[]>([]);

  // Pagination & Infinite Scroll State
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  currentPage = signal<number>(0);
  pageSize = 20;
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  hasMore = signal<boolean>(false);
  showScrollTop = signal<boolean>(false);

  private mainSearchSubject = new Subject<string>();
  private mainSearchSub?: Subscription;
  private observer?: IntersectionObserver;

  // Product Selection & Live Search State
  selectedProduct = signal<any | null>(null);
  productOptions = signal<any[]>([]);
  productSearchLoading = signal<boolean>(false);
  isProductDropdownOpen = signal<boolean>(false);
  productSearchText = '';
  private productSearchSubject = new Subject<string>();
  private productSearchSub?: Subscription;

  searchQuery = '';
  selectedStoreFilter: number | string = '';
  selectedBadgeFilter: string = '';
  selectedStatusFilter: string = '';

  offerForm!: FormGroup;
  isModalOpen = false;
  editingOfferId: number | null = null;

  // Image upload
  selectedImageFiles: File[] = [];
  imagePreviewUrls: string[] = [];
  existingImageUrl: string | null = null;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const yOffset = window.pageYOffset || document.documentElement.scrollTop;
    this.showScrollTop.set(yOffset > 400);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    if (this.authService.isStoreManager() && this.authService.currentUser()?.storeId) {
      this.selectedStoreFilter = this.authService.currentUser()?.storeId!;
    }
    this.initForm();
    this.resetAndLoadOffers();
    this.loadDropdowns();

    this.mainSearchSub = this.mainSearchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.resetAndLoadOffers();
    });

    this.productSearchSub = this.productSearchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchProducts(query);
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.mainSearchSub?.unsubscribe();
    this.productSearchSub?.unsubscribe();
    this.observer?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        if (!this.loading() && !this.loadingMore() && this.hasMore()) {
          this.loadNextPage();
        }
      }
    }, {
      rootMargin: '250px'
    });

    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  private reobserveSentinel(): void {
    setTimeout(() => {
      if (this.observer && this.scrollSentinel?.nativeElement) {
        this.observer.disconnect();
        this.observer.observe(this.scrollSentinel.nativeElement);
      }
    }, 100);
  }

  onSearchChange(value: string): void {
    this.mainSearchSubject.next(value);
  }

  onFilterStoreChange(storeId: any): void {
    this.selectedStoreFilter = storeId;
    this.resetAndLoadOffers();
  }

  onFilterBadgeChange(badgeType: any): void {
    this.selectedBadgeFilter = badgeType;
    this.resetAndLoadOffers();
  }

  onFilterStatusChange(status: any): void {
    this.selectedStatusFilter = status;
    this.resetAndLoadOffers();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    if (!this.authService.isStoreManager()) {
      this.selectedStoreFilter = '';
    }
    this.selectedBadgeFilter = '';
    this.selectedStatusFilter = '';
    this.resetAndLoadOffers();
  }

  resetAndLoadOffers(): void {
    this.currentPage.set(0);
    this.loading.set(true);
    this.loadingMore.set(false);

    const storeIdVal = this.authService.isStoreManager() && this.authService.currentUser()?.storeId
      ? Number(this.authService.currentUser()?.storeId)
      : (this.selectedStoreFilter ? Number(this.selectedStoreFilter) : null);

    const activeVal = this.selectedStatusFilter === 'ACTIVE' ? true :
                     (this.selectedStatusFilter === 'DISABLED' ? false : null);

    this.offerService.getPagedOffers(
      0,
      this.pageSize,
      this.searchQuery,
      storeIdVal,
      this.selectedBadgeFilter,
      activeVal
    ).subscribe({
      next: (res) => {
        const items = res?.content || [];
        this.offers.set(items);
        this.totalElements.set(res?.totalElements || 0);
        this.totalPages.set(res?.totalPages || 0);
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loading.set(false);
        this.cd.detectChanges();
        this.reobserveSentinel();
      },
      error: (err) => {
        console.error('Failed to load paged offers:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  loadNextPage(): void {
    if (this.loadingMore() || !this.hasMore()) return;

    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);

    const storeIdVal = this.authService.isStoreManager() && this.authService.currentUser()?.storeId
      ? Number(this.authService.currentUser()?.storeId)
      : (this.selectedStoreFilter ? Number(this.selectedStoreFilter) : null);

    const activeVal = this.selectedStatusFilter === 'ACTIVE' ? true :
                     (this.selectedStatusFilter === 'DISABLED' ? false : null);

    this.offerService.getPagedOffers(
      nextPage,
      this.pageSize,
      this.searchQuery,
      storeIdVal,
      this.selectedBadgeFilter,
      activeVal
    ).subscribe({
      next: (res) => {
        const newItems = res?.content || [];
        this.offers.update(prev => [...prev, ...newItems]);
        this.currentPage.set(res?.number ?? nextPage);
        this.totalElements.set(res?.totalElements || this.totalElements());
        this.totalPages.set(res?.totalPages || this.totalPages());
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loadingMore.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load next page of offers:', err);
        this.loadingMore.set(false);
        this.cd.detectChanges();
      }
    });
  }

  initForm(): void {
    this.offerForm = this.fb.group({
      title_en: ['', Validators.required],
      title_ar: ['', Validators.required],
      store_id: ['', Validators.required],
      category_id: ['', Validators.required],
      city_id: ['', Validators.required],
      product_id: [null],
      original_price: [0, [Validators.required, Validators.min(0)]],
      offer_price: [0, [Validators.required, Validators.min(0)]],
      discount_pct: [{ value: 0, disabled: true }],
      badge_type: ['NONE', Validators.required],
      valid_from: ['', Validators.required],
      valid_until: ['', Validators.required],
      description_en: [''],
      description_ar: [''],
      terms_en: [''],
      terms_ar: [''],
      is_featured: [false],
      is_flash: [false],
      is_online: [false],
      is_in_store: [true],
      is_active: [true]
    });

    // Auto-calculate discount percentage
    this.offerForm.valueChanges.subscribe(val => {
      const orig = Number(val.original_price);
      const offer = Number(val.offer_price);
      if (orig > 0 && offer >= 0 && offer <= orig) {
        const pct = Math.round(((orig - offer) / orig) * 100);
        this.offerForm.get('discount_pct')?.setValue(pct, { emitEvent: false });
      } else {
        this.offerForm.get('discount_pct')?.setValue(0, { emitEvent: false });
      }
    });
  }

  loadDropdowns(): void {
    this.storeService.getStores().subscribe({
      next: (res) => {
        this.stores.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load stores:', err)
    });

    this.categoryService.getCategories().subscribe({
      next: (res: any) => {
        const cats = Array.isArray(res) ? res : (res?.data || []);
        this.categories.set(cats);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });

    this.cityService.getCities().subscribe({
      next: (res) => {
        this.cities.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });

    this.searchProducts('');
  }

  extendOffer(id: number, days: number = 7): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Extend Offer Expiration?' : 'تمديد فترة العرض؟',
      text: this.currentLang() === 'en'
        ? `Extend this offer by +${days} days and activate it?`
        : `هل تريد تمديد فترة العرض بـ +${days} أيام وتفعيله؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.currentLang() === 'en' ? `Yes, Extend (+${days} Days)` : `نعم، تمديد (+${days} أيام)`,
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.offerService.extendOffer(id, days).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Extended!' : 'تم التمديد!',
              text: this.currentLang() === 'en' ? `Offer extended by +${days} days.` : `تم تمديد العرض بنجاح بـ +${days} أيام.`,
              timer: 1800,
              showConfirmButton: false
            });
            this.resetAndLoadOffers();
          },
          error: (err) => {
            console.error('Failed to extend offer:', err);
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
              text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to extend offer.' : 'فشل تمديد العرض.')
            });
          }
        });
      }
    });
  }

  openAddModal(): void {
    this.editingOfferId = null;
    this.selectedImageFiles = [];
    this.imagePreviewUrls = [];
    this.existingImageUrl = null;
    this.selectedProduct.set(null);
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.searchProducts('');

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const defaultStoreId = (this.authService.isStoreManager() && this.authService.currentUser()?.storeId)
      ? this.authService.currentUser()?.storeId
      : (this.stores().length > 0 ? this.stores()[0].id : '');

    this.offerForm.reset({
      title_en: '',
      title_ar: '',
      store_id: defaultStoreId,
      category_id: this.categories().length > 0 ? this.categories()[0].id : '',
      city_id: this.cities().length > 0 ? this.cities()[0].id : '',
      product_id: null,
      original_price: 0,
      offer_price: 0,
      discount_pct: 0,
      badge_type: 'NONE',
      valid_from: today,
      valid_until: nextWeek,
      description_en: '',
      description_ar: '',
      terms_en: '',
      terms_ar: '',
      is_featured: false,
      is_flash: false,
      is_online: false,
      is_in_store: true,
      is_active: true
    });
    this.isModalOpen = true;
  }


  openEditModal(o: any): void {
    this.editingOfferId = o.id;
    this.selectedImageFiles = [];
    this.imagePreviewUrls = [];
    this.existingImageUrl = o.imageUrl || o.thumbnailUrl || o.image_url || null;
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.searchProducts('');

    const pId = o.productId ?? o.product_id ?? (o.product ? o.product.id : null);
    const storeId = o.storeId ?? o.store_id ?? (o.store ? o.store.id : '');
    const categoryId = o.categoryId ?? o.category_id ?? (o.category ? o.category.id : '');
    const cityId = o.cityId ?? o.city_id ?? (o.city ? o.city.id : '');

    const formatDate = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') {
        return val.split('T')[0];
      }
      if (Array.isArray(val)) {
        const y = val[0];
        const m = String(val[1]).padStart(2, '0');
        const d = String(val[2]).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return '';
    };

    if (pId) {
      this.productService.getProductById(pId).subscribe({
        next: (prod) => {
          if (prod) {
            this.selectedProduct.set(prod);
          }
          this.cd.detectChanges();
        },
        error: () => {
          // Fallback minimal object from offer fields
          this.selectedProduct.set({
            id: pId,
            nameEn: o.productNameEn || o.product_name_en || o.titleEn,
            nameAr: o.productNameAr || o.product_name_ar || o.titleAr,
            brand: o.brandNameEn || o.brand_name_en,
            brandAr: o.brandNameAr || o.brand_name_ar,
            primaryImageUrl: o.productPrimaryImageUrl || o.product_primary_image_url
          });
          this.cd.detectChanges();
        }
      });
    } else {
      this.selectedProduct.set(null);
    }

    this.offerForm.reset({
      title_en: o.titleEn || o.title_en || '',
      title_ar: o.titleAr || o.title_ar || '',
      store_id: storeId,
      category_id: categoryId,
      city_id: cityId,
      product_id: pId,
      original_price: o.originalPrice ?? o.original_price ?? 0,
      offer_price: o.offerPrice ?? o.offer_price ?? 0,
      discount_pct: o.discountPct ?? o.discount_pct ?? 0,
      badge_type: o.badgeType || o.badge_type || 'NONE',
      valid_from: formatDate(o.validFrom || o.valid_from),
      valid_until: formatDate(o.validUntil || o.valid_until),
      description_en: o.descriptionEn || o.description_en || '',
      description_ar: o.descriptionAr || o.description_ar || '',
      terms_en: o.termsEn || o.terms_en || '',
      terms_ar: o.termsAr || o.terms_ar || '',
      is_featured: o.featured === true || o.is_featured === 1 || o.is_featured === true,
      is_flash: o.flash === true || o.is_flash === 1 || o.is_flash === true,
      is_online: o.online === true || o.is_online === 1 || o.is_online === true,
      is_in_store: o.inStore === true || o.is_in_store === 1 || o.is_in_store === true || o.inStore === undefined,
      is_active: o.active === true || o.is_active === 1 || o.is_active === true || o.active === undefined
    });

    // Auto-calculate discount pct right after reset
    const orig = Number(o.originalPrice ?? o.original_price ?? 0);
    const offerPrice = Number(o.offerPrice ?? o.offer_price ?? 0);
    if (orig > 0 && offerPrice >= 0 && offerPrice <= orig) {
      const pct = Math.round(((orig - offerPrice) / orig) * 100);
      this.offerForm.get('discount_pct')?.setValue(pct, { emitEvent: false });
    }

    this.isModalOpen = true;
    this.cd.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onImageFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.selectedImageFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
          this.cd.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImageFile(index: number): void {
    this.selectedImageFiles.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Cpath fill='%23cbd5e1' d='M160 110a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm100 120H140l50-65 35 45 25-30 40 50z'/%3E%3Ctext x='50%25' y='82%25' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='500'%3EDealSpot%3C/text%3E%3C/svg%3E";
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  onProductSearchInput(query: string): void {
    this.productSearchText = query;
    this.isProductDropdownOpen.set(true);
    this.productSearchSubject.next(query);
  }

  openProductDropdown(): void {
    this.isProductDropdownOpen.set(true);
    if (this.productOptions().length === 0) {
      this.searchProducts(this.productSearchText);
    }
  }

  closeProductDropdown(): void {
    setTimeout(() => {
      this.isProductDropdownOpen.set(false);
      this.cd.detectChanges();
    }, 250);
  }

  selectProduct(product: any | null): void {
    this.selectedProduct.set(product);
    this.offerForm.patchValue({ product_id: product ? product.id : null });
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.cd.detectChanges();
  }

  clearSelectedProduct(): void {
    this.selectProduct(null);
  }

  getProductImageUrl(product: any): string {
    if (!product) return 'assets/images/placeholder-product.png';
    const raw = product.primaryImageUrl || product.primary_image_url || product.imageUrl || product.image_url;
    if (raw && typeof raw === 'string' && raw.trim() !== '') {
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
        return raw;
      }
      return this.filePath + raw;
    }
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      const img = typeof first === 'string' ? first : (first.imageUrl || first.image_url);
      if (img) {
        if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
          return img;
        }
        return this.filePath + img;
      }
    }
    return 'assets/images/placeholder-product.png';
  }

  searchProducts(query: string = ''): void {
    this.productSearchLoading.set(true);
    this.productService.getPagedProducts(0, 30, query).subscribe({
      next: (res) => {
        const items = res?.content || [];
        this.productOptions.set(items);
        this.productSearchLoading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to query products for offers:', err);
        this.productSearchLoading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    const val = this.offerForm.getRawValue();
    const formData = new FormData();

    const offerDto = {
      titleEn: val.title_en,
      titleAr: val.title_ar,
      storeId: Number(val.store_id),
      categoryId: Number(val.category_id),
      cityId: Number(val.city_id),
      productId: val.product_id ? Number(val.product_id) : null,
      originalPrice: Number(val.original_price),
      offerPrice: Number(val.offer_price),
      discountPct: Number(val.discount_pct),
      badgeType: val.badge_type,
      validFrom: val.valid_from,
      validUntil: val.valid_until,
      descriptionEn: val.description_en,
      descriptionAr: val.description_ar,
      termsEn: val.terms_en,
      termsAr: val.terms_ar,
      featured: val.is_featured,
      flash: val.is_flash,
      online: val.is_online,
      inStore: val.is_in_store,
      active: val.is_active
    };

    formData.append('data', new Blob([JSON.stringify(offerDto)], { type: 'application/json' }));

    if (this.selectedImageFiles && this.selectedImageFiles.length > 0) {
      this.selectedImageFiles.forEach(file => {
        formData.append('files', file);
      });
    }

    const req$ = this.editingOfferId
      ? this.offerService.updateOffer(this.editingOfferId, formData)
      : this.offerService.createOffer(formData);

    req$.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Success!' : 'تمت العملية بنجاح!',
          text: this.currentLang() === 'en'
            ? (this.editingOfferId ? 'Offer updated successfully.' : 'Offer created successfully.')
            : (this.editingOfferId ? 'تم تحديث العرض بنجاح.' : 'تم إنشاء العرض بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.resetAndLoadOffers();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save offer:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save offer.' : 'فشل حفظ العرض.')
        });
      }
    });
  }

  deleteOffer(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en'
        ? 'Do you really want to delete this promotional offer?'
        : 'هل تريد حقاً حذف هذا العرض الترويجي؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.offerService.deleteOffer(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Offer has been deleted.' : 'تم حذف العرض بنجاح.',
              'success'
            );
            this.resetAndLoadOffers();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete offer.' : 'فشل حذف العرض.',
              'error'
            );
          }
        });
      }
    });
  }

  getOfferImageUrl(offer: any): string {
    if (!offer) return 'https://placehold.co/100x100?text=No+Image';
    const raw = offer.imageUrl || offer.thumbnailUrl || offer.image_url || offer.thumbnail_url || offer.productPrimaryImageUrl || offer.product_primary_image_url;
    if (raw && typeof raw === 'string' && raw.trim() !== '') {
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
        return raw;
      }
      return this.filePath + raw;
    }
    return 'https://placehold.co/100x100?text=No+Image';
  }
}
