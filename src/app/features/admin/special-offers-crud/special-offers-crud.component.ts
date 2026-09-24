import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SpecialOfferService, SpecialOfferItem, OfferPeriodSplitRequest } from '../../../core/services/special-offer.service';
import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
import { OfferService } from '../../../core/services/offer.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-special-offers-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, RouterLink],
  templateUrl: './special-offers-crud.component.html',
  styleUrl: './special-offers-crud.component.css'
})
export class SpecialOffersCrudComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  specialOfferService = inject(SpecialOfferService);
  storeService = inject(StoreService);
  cityService = inject(CityService);
  offerService = inject(OfferService);
  authService = inject(AuthService);
  translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  specialOffers = signal<SpecialOfferItem[]>([]);
  totalElements = signal<number>(0);
  loading = signal<boolean>(false);

  // Filters
  searchQuery: string = '';
  selectedStoreFilter: any = null;
  selectedStatusFilter: string = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Pagination
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  totalPages = signal<number>(0);

  // Dropdown data
  stores = signal<any[]>([]);
  cities = signal<any[]>([]);

  statusFilterOptions = [
    { id: '', nameEn: 'All Statuses', nameAr: 'جميع الحالات' },
    { id: 'ACTIVE', nameEn: 'Active Only', nameAr: 'نشط فقط' },
    { id: 'EXPIRED', nameEn: 'Expired Only', nameAr: 'منتهي فقط' },
    { id: 'UPCOMING', nameEn: 'Upcoming Only', nameAr: 'قادم فقط' },
    { id: 'DISABLED', nameEn: 'Disabled', nameAr: 'معطل' }
  ];

  // Campaign Modal
  isModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingId: number | null = null;
  form!: FormGroup;
  selectedBannerFile: File | null = null;
  bannerPreviewUrl: string | null = null;
  submitting = signal<boolean>(false);

  // Deal Management Modal
  isDealsModalOpen = signal<boolean>(false);
  activeCampaignForDeals: SpecialOfferItem | null = null;
  availableOffers = signal<any[]>([]);
  selectedOfferIds = signal<Set<number>>(new Set());
  loadingDeals = signal<boolean>(false);
  dealSearchQuery: string = '';

  // Deal Price Override / Period Split Modal
  isDealSplitModalOpen = signal<boolean>(false);
  targetDealForSplit = signal<any | null>(null);
  submittingDealSplit = signal<boolean>(false);
  dealSplitDiscountPct = signal<number>(0);
  dealSplitForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.initDealSplitForm();
    this.loadStores();
    this.loadCities();
    this.loadSpecialOffers();

    this.searchSub = this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadSpecialOffers();
      });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  initForm(): void {
    this.form = this.fb.group({
      titleEn: ['', [Validators.required, Validators.maxLength(200)]],
      titleAr: ['', [Validators.required, Validators.maxLength(200)]],
      descriptionEn: [''],
      descriptionAr: [''],
      storeId: [null],
      cityId: [null],
      badgeText: ['EID SPECIAL'],
      validFrom: ['', [Validators.required]],
      validUntil: ['', [Validators.required]],
      featured: [true],
      active: [true]
    });
  }

  loadStores(): void {
    this.storeService.getStores().subscribe({
      next: (res) => this.stores.set(res || []),
      error: () => this.stores.set([])
    });
  }

  loadCities(): void {
    this.cityService.getCities().subscribe({
      next: (res) => this.cities.set(res || []),
      error: () => this.cities.set([])
    });
  }

  loadSpecialOffers(): void {
    this.loading.set(true);
    const storeId = this.selectedStoreFilter ? Number(this.selectedStoreFilter) : null;
    const status = this.selectedStatusFilter || null;

    this.specialOfferService.getPagedSpecialOffers(
      this.currentPage(),
      this.pageSize(),
      this.searchQuery,
      storeId,
      status,
      null
    ).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res && res.content) {
          this.specialOffers.set(res.content);
          this.totalElements.set(res.totalElements || 0);
          this.totalPages.set(res.totalPages || 0);
        } else {
          this.specialOffers.set([]);
          this.totalElements.set(0);
        }
      },
      error: () => {
        this.loading.set(false);
        this.specialOffers.set([]);
      }
    });
  }

  onSearchChange(val: string): void {
    this.searchSubject.next(val);
  }

  onFilterStoreChange(storeId: any): void {
    this.selectedStoreFilter = storeId;
    this.currentPage.set(0);
    this.loadSpecialOffers();
  }

  onFilterStatusChange(status: any): void {
    this.selectedStatusFilter = status;
    this.currentPage.set(0);
    this.loadSpecialOffers();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedStoreFilter = null;
    this.selectedStatusFilter = '';
    this.currentPage.set(0);
    this.loadSpecialOffers();
  }

  openAddModal(): void {
    this.isEditMode.set(false);
    this.editingId = null;
    this.selectedBannerFile = null;
    this.bannerPreviewUrl = null;
    this.form.reset({
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      storeId: this.authService.isStoreManager() ? this.authService.currentUser()?.storeId : null,
      cityId: null,
      badgeText: 'EID SPECIAL',
      validFrom: new Date().toISOString().substring(0, 10),
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      featured: true,
      active: true
    });
    this.isModalOpen.set(true);
  }

  openEditModal(item: SpecialOfferItem): void {
    this.isEditMode.set(true);
    this.editingId = item.id;
    this.selectedBannerFile = null;
    this.bannerPreviewUrl = item.bannerUrl ? this.getBannerUrl(item.bannerUrl) : null;

    this.form.patchValue({
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn || '',
      descriptionAr: item.descriptionAr || '',
      storeId: item.storeId || null,
      cityId: item.cityId || null,
      badgeText: item.badgeText || '',
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      featured: item.featured,
      active: item.active
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onBannerFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedBannerFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.bannerPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeBanner(): void {
    this.selectedBannerFile = null;
    this.bannerPreviewUrl = null;
  }

  saveSpecialOffer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = this.form.value;

    const dto = {
      titleEn: val.titleEn,
      titleAr: val.titleAr,
      descriptionEn: val.descriptionEn,
      descriptionAr: val.descriptionAr,
      storeId: val.storeId ? Number(val.storeId) : null,
      cityId: val.cityId ? Number(val.cityId) : null,
      badgeText: val.badgeText,
      validFrom: val.validFrom,
      validUntil: val.validUntil,
      featured: val.featured,
      active: val.active
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (this.selectedBannerFile) {
      formData.append('banner', this.selectedBannerFile);
    }

    const op = this.isEditMode()
      ? this.specialOfferService.updateSpecialOfferMultipart(this.editingId!, formData)
      : this.specialOfferService.createSpecialOfferMultipart(formData);

    op.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Saved Successfully' : 'تم الحفظ بنجاح',
          timer: 1500,
          showConfirmButton: false
        });
        this.loadSpecialOffers();
      },
      error: (err) => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err.error?.message || (this.currentLang() === 'en' ? 'Failed to save special offer' : 'فشل حفظ العرض الخاص')
        });
      }
    });
  }

  deleteSpecialOffer(item: SpecialOfferItem): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' ? `Delete "${item.titleEn}"? Deals will be unlinked but not deleted.` : `حذف "${item.titleAr}"؟ سيتم فك ارتباط العروض دون حذفها.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete' : 'نعم، احذف',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.specialOfferService.deleteSpecialOffer(item.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadSpecialOffers();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
              text: this.currentLang() === 'en' ? 'Failed to delete' : 'فشل الحذف'
            });
          }
        });
      }
    });
  }

  // Manage Attached Deals
  openDealsModal(campaign: SpecialOfferItem): void {
    this.activeCampaignForDeals = campaign;
    this.isDealsModalOpen.set(true);
    this.loadingDeals.set(true);
    this.dealSearchQuery = '';

    // Fetch details of campaign to get latest attached offers
    this.specialOfferService.getSpecialOfferById(campaign.id).subscribe({
      next: (fullCampaign) => {
        const set = new Set<number>();
        if (fullCampaign.offers) {
          fullCampaign.offers.forEach(o => set.add(o.id));
        }
        this.selectedOfferIds.set(set);

        // Fetch all offers for this store (or all offers if platform-wide)
        this.offerService.getAllOffers(campaign.storeId, false).subscribe({
          next: (allOffers) => {
            this.loadingDeals.set(false);
            this.availableOffers.set(allOffers || []);
          },
          error: () => {
            this.loadingDeals.set(false);
            this.availableOffers.set([]);
          }
        });
      },
      error: () => {
        this.loadingDeals.set(false);
      }
    });
  }

  closeDealsModal(): void {
    this.isDealsModalOpen.set(false);
    this.activeCampaignForDeals = null;
  }

  isOfferSelected(offerId: number): boolean {
    return this.selectedOfferIds().has(offerId);
  }

  toggleOfferSelection(offerId: number): void {
    const set = new Set(this.selectedOfferIds());
    if (set.has(offerId)) {
      set.delete(offerId);
    } else {
      set.add(offerId);
    }
    this.selectedOfferIds.set(set);
  }

  saveAttachedDeals(): void {
    if (!this.activeCampaignForDeals) return;

    this.loadingDeals.set(true);
    const offerIdsArray = Array.from(this.selectedOfferIds());

    this.specialOfferService.attachDeals(this.activeCampaignForDeals.id, offerIdsArray).subscribe({
      next: () => {
        this.loadingDeals.set(false);
        this.closeDealsModal();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Deals Updated' : 'تم تحديث العروض المرفقة',
          timer: 1500,
          showConfirmButton: false
        });
        this.loadSpecialOffers();
      },
      error: () => {
        this.loadingDeals.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: this.currentLang() === 'en' ? 'Failed to update deals' : 'فشل تحديث العروض'
        });
      }
    });
  }

  filteredAvailableOffers(): any[] {
    const list = this.availableOffers();
    if (!this.dealSearchQuery || this.dealSearchQuery.trim() === '') {
      return list;
    }
    const q = this.dealSearchQuery.toLowerCase().trim();
    return list.filter(o =>
      (o.titleEn && o.titleEn.toLowerCase().includes(q)) ||
      (o.titleAr && o.titleAr.toLowerCase().includes(q)) ||
      (o.productNameEn && o.productNameEn.toLowerCase().includes(q)) ||
      (o.storeNameEn && o.storeNameEn.toLowerCase().includes(q))
    );
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '';
    }
    url = url.trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    while (url.startsWith('/')) {
      url = url.substring(1);
    }
    let base = this.filePath || environment.filePath;
    if (!base.endsWith('/')) {
      base += '/';
    }
    if (!url.startsWith('uploads/')) {
      url = 'uploads/' + url;
    }
    return base + url;
  }

  getBannerUrl(url: string | undefined): string {
    const resolved = this.getImageUrl(url);
    return resolved || 'assets/images/placeholder-banner.png';
  }

  getStoreLogoUrl(item: any): string {
    const raw = item.storeLogoUrl || item.store_logo_url || (item.store ? (item.store.logoUrl || item.store.logo_url) : null);
    const resolved = this.getImageUrl(raw);
    return resolved || 'assets/images/store-placeholder.png';
  }

  getOfferImageUrl(offer: any): string {
    const raw = offer.imageUrl || offer.image_url || offer.productPrimaryImageUrl || offer.thumbnailUrl;
    const resolved = this.getImageUrl(raw);
    return resolved || 'assets/images/placeholder.png';
  }

  getStatusBadgeClass(item: SpecialOfferItem): string {
    switch (item.status) {
      case 'ACTIVE': return 'badge-active';
      case 'EXPIRED': return 'badge-expired';
      case 'UPCOMING': return 'badge-upcoming';
      default: return 'badge-disabled';
    }
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.loadSpecialOffers();
    }
  }

  initDealSplitForm(): void {
    this.dealSplitForm = this.fb.group({
      existingOfferId: [null, Validators.required],
      newOfferPrice: [0, [Validators.required, Validators.min(0.01)]],
      newOriginalPrice: [0],
      splitValidFrom: ['', Validators.required],
      splitValidUntil: ['', Validators.required],
      titleEn: [''],
      titleAr: [''],
      badgeType: ['PROMO']
    });

    this.dealSplitForm.valueChanges.subscribe(val => {
      const orig = Number(val.newOriginalPrice);
      const offer = Number(val.newOfferPrice);
      if (orig > 0 && offer >= 0 && offer <= orig) {
        this.dealSplitDiscountPct.set(Math.round(((orig - offer) / orig) * 100));
      } else {
        this.dealSplitDiscountPct.set(0);
      }
    });
  }

  openSplitForDeal(offer: any): void {
    if (!this.activeCampaignForDeals) return;
    this.targetDealForSplit.set(offer);

    const origPrice = Number(offer.originalPrice ?? offer.original_price ?? offer.offerPrice ?? 0);
    const curPrice = Number(offer.offerPrice ?? offer.offer_price ?? 0);

    const campFrom = this.activeCampaignForDeals.validFrom;
    const campUntil = this.activeCampaignForDeals.validUntil;

    const offerFrom = offer.validFrom || offer.valid_from || campFrom;
    const offerUntil = offer.validUntil || offer.valid_until || campUntil;

    // Use intersection of campaign dates and offer dates
    const splitFrom = campFrom > offerFrom ? campFrom : offerFrom;
    const splitUntil = campUntil < offerUntil ? campUntil : offerUntil;

    this.dealSplitForm.reset({
      existingOfferId: offer.id,
      newOfferPrice: curPrice,
      newOriginalPrice: origPrice,
      splitValidFrom: splitFrom,
      splitValidUntil: splitUntil,
      titleEn: (offer.titleEn || offer.title_en || '') + ` (${this.activeCampaignForDeals.titleEn})`,
      titleAr: (offer.titleAr || offer.title_ar || '') + ` (${this.activeCampaignForDeals.titleAr})`,
      badgeType: 'PROMO'
    });

    if (origPrice > 0 && curPrice >= 0 && curPrice <= origPrice) {
      this.dealSplitDiscountPct.set(Math.round(((origPrice - curPrice) / origPrice) * 100));
    }

    this.isDealSplitModalOpen.set(true);
  }

  closeDealSplitModal(): void {
    this.isDealSplitModalOpen.set(false);
    this.targetDealForSplit.set(null);
  }

  submitDealSplit(): void {
    if (!this.activeCampaignForDeals || this.dealSplitForm.invalid) {
      this.dealSplitForm.markAllAsTouched();
      return;
    }

    const val = this.dealSplitForm.getRawValue();
    const splitReq: OfferPeriodSplitRequest = {
      existingOfferId: Number(val.existingOfferId),
      specialOfferId: this.activeCampaignForDeals.id,
      newOfferPrice: Number(val.newOfferPrice),
      newOriginalPrice: val.newOriginalPrice ? Number(val.newOriginalPrice) : null,
      splitValidFrom: val.splitValidFrom,
      splitValidUntil: val.splitValidUntil,
      titleEn: val.titleEn || undefined,
      titleAr: val.titleAr || undefined,
      badgeType: val.badgeType || 'PROMO'
    };

    this.submittingDealSplit.set(true);
    this.specialOfferService.splitOfferPrice(this.activeCampaignForDeals.id, splitReq).subscribe({
      next: (newOffer) => {
        this.submittingDealSplit.set(false);
        this.closeDealSplitModal();

        const set = new Set(this.selectedOfferIds());
        if (newOffer && newOffer.id) {
          set.add(newOffer.id);
        }
        this.selectedOfferIds.set(set);

        const isUpdate = this.targetDealForSplit()?.specialOfferId === this.activeCampaignForDeals?.id;
        Swal.fire({
          icon: 'success',
          title: isUpdate
            ? (this.currentLang() === 'en' ? 'Campaign Price Updated!' : 'تم تحديث سعر الحملة بنجاح!')
            : (this.currentLang() === 'en' ? 'Campaign Price Created!' : 'تم إنشاء وتطبيق سعر الحملة بنجاح!'),
          text: isUpdate
            ? (this.currentLang() === 'en' ? 'The promotional price was updated in-place on this offer.' : 'تم تحديث السعر الترويجي مباشرة في العرض دون تكرار.')
            : (this.currentLang() === 'en' ? 'The promotional price was scheduled and attached to this campaign.' : 'تمت جدولة السعر الترويجي وإرفاقه بالحملة تلقائياً.'),
          timer: 2000,
          showConfirmButton: false
        });

        if (this.activeCampaignForDeals) {
          this.openDealsModal(this.activeCampaignForDeals);
        }
        this.loadSpecialOffers();
      },
      error: (err) => {
        this.submittingDealSplit.set(false);
        console.error('Failed to split deal price for campaign:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Failed to Override Price' : 'فشل تجاوز السعر',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to split price.' : 'حدث خطأ أثناء تجاوز السعر.')
        });
      }
    });
  }
}
