import { Component, inject, signal, computed, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfferService } from '../../../core/services/offer.service';
import { CategoryService } from '../../../core/services/category.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { CityService } from '../../../core/services/city.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';

import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-offer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './offer-list.component.html',
  styleUrls: ['./offer-list.component.css']
})
export class OfferListComponent implements OnInit {
  private offerService = inject(OfferService);
  private categoryService = inject(CategoryService);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private cityService = inject(CityService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  rawOffers = signal<any[]>([]);
  offers = signal<any[]>([]);
  categories = signal<any[]>([]);
  stores = signal<any[]>([]);
  storeMap = signal<Record<number, any>>({});
  productMap = signal<Record<number, any>>({});
  cities = signal<any[]>([]);
  savedOfferIds = signal<number[]>([]);
  onlySaved = signal<boolean>(false);

  // Hierarchical Category Computed Signals
  mainCategories = computed(() => {
    return this.categories().filter(c => !c.parentId && !c.parent_id);
  });

  availableSubcategories = computed(() => {
    if (!this.selectedMainCategoryId) return [];
    const mainId = Number(this.selectedMainCategoryId);
    return this.categories().filter(c => (c.parentId === mainId || c.parent_id === mainId));
  });

  // Filter States
  selectedCityId: number | null = null;
  selectedMainCategoryId: number | null = null;
  selectedSubCategoryId: number | null = null;
  selectedStoreId: number | null = null;
  selectedDiscountRange: number = 0;
  showFlashOnly = false;
  showFeaturedOnly = false;
  searchQuery = '';

  loading = false;
  copiedOfferId: number | null = null;

  constructor() {
    // Monitor global active city signal
    effect(() => {
      const city = this.cityService.selectedCity();
      if (city && this.selectedCityId === null) {
        this.selectedCityId = city.id;
        this.applyFilters();
      }
    });

    // Monitor auth state for real saved offers
    effect(() => {
      const user = this.authService.currentUser();
      if (user && this.authService.isAuthenticated()) {
        this.loadSavedOffers();
      } else {
        this.savedOfferIds.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data && data['onlySaved']) {
        this.onlySaved.set(true);
      }
    });

    this.loadSavedOffers();
    this.loadDropdowns();
    this.loadOffers();


    // Handle query parameters (from Home page or direct links)
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.handleCategoryParam(params['category']);
      }
      if (params['store']) {
        this.selectedStoreId = Number(params['store']);
      }
      if (params['flash']) {
        this.showFlashOnly = params['flash'] === 'true' || params['flash'] === true;
      }
      if (params['featured']) {
        this.showFeaturedOnly = params['featured'] === 'true' || params['featured'] === true;
      }
      if (params['search']) {
        this.searchQuery = params['search'];
      }
      if (params['city']) {
        this.selectedCityId = Number(params['city']);
      }

      this.applyFilters();
    });
  }

  handleCategoryParam(catIdParam: any): void {
    if (!catIdParam) {
      this.selectedMainCategoryId = null;
      this.selectedSubCategoryId = null;
      return;
    }
    const catId = Number(catIdParam);
    const found = this.categories().find(c => c.id === catId);
    if (found) {
      const pId = found.parentId || found.parent_id;
      if (pId) {
        this.selectedMainCategoryId = pId;
        this.selectedSubCategoryId = catId;
      } else {
        this.selectedMainCategoryId = catId;
        this.selectedSubCategoryId = null;
      }
    } else {
      this.selectedMainCategoryId = catId;
    }
  }

  onMainCategoryChange(val: any): void {
    this.selectedMainCategoryId = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.selectedSubCategoryId = null;
    this.updateCategoryQueryParams();
    this.applyFilters();
  }

  onSubCategoryChange(val: any): void {
    this.selectedSubCategoryId = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.updateCategoryQueryParams();
    this.applyFilters();
  }

  private updateCategoryQueryParams(): void {
    const currentParams = { ...this.route.snapshot.queryParams };
    if (this.selectedSubCategoryId) {
      currentParams['category'] = this.selectedSubCategoryId;
    } else if (this.selectedMainCategoryId) {
      currentParams['category'] = this.selectedMainCategoryId;
    } else {
      delete currentParams['category'];
    }
    this.router.navigate([], { queryParams: currentParams, queryParamsHandling: 'merge' });
  }

  loadDropdowns(): void {
    this.categoryService.getCategories().subscribe({
      next: (c: any) => {
        const list = Array.isArray(c) ? c : (c?.data || []);
        this.categories.set(list);

        // Re-evaluate category query params once categories are loaded
        const catParam = this.route.snapshot.queryParams['category'];
        if (catParam) {
          this.handleCategoryParam(catParam);
          this.applyFilters();
        }

        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });

    this.storeService.getStores().subscribe({
      next: (s) => {
        const storeList = s || [];
        this.stores.set(storeList);
        const map: Record<number, any> = {};
        storeList.forEach((store: any) => {
          if (store && store.id) map[store.id] = store;
        });
        this.storeMap.set(map);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load stores:', err)
    });

    this.cityService.getCities().subscribe({
      next: (c) => {
        this.cities.set(c || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });

    this.productService.getProducts().subscribe({
      next: (prods: any[]) => {
        const list = prods || [];
        const map: Record<number, any> = {};
        list.forEach((p: any) => {
          if (p && p.id) {
            map[Number(p.id)] = p;
            map[p.id] = p;
          }
        });
        this.productMap.set(map);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load products:', err)
    });
  }

  loadOffers(): void {
    this.loading = true;
    this.offerService.getAllOffers().subscribe({
      next: (res) => {
        this.rawOffers.set(res || []);
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load offers:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  // Filters
  applyFilters(): void {
    let list = [...this.rawOffers()];

    if (this.onlySaved()) {
      list = list.filter(o => this.isSaved(Number(o.id)));
    }

    if (this.selectedCityId) {
      const cId = Number(this.selectedCityId);
      list = list.filter(o => o.cityId === cId || o.city_id === cId);
    }


    if (this.selectedSubCategoryId) {
      const sId = Number(this.selectedSubCategoryId);
      list = list.filter(o => o.categoryId === sId || o.category_id === sId);
    } else if (this.selectedMainCategoryId) {
      const mId = Number(this.selectedMainCategoryId);
      const childCatIds = this.categories()
        .filter(c => c.parentId === mId || c.parent_id === mId)
        .map(c => Number(c.id));
      const allowedCatIds = [mId, ...childCatIds];
      list = list.filter(o => {
        const oCatId = Number(o.categoryId || o.category_id);
        return allowedCatIds.includes(oCatId);
      });
    }

    if (this.selectedStoreId) {
      const stId = Number(this.selectedStoreId);
      list = list.filter(o => o.storeId === stId || o.store_id === stId);
    }

    if (this.selectedDiscountRange > 0) {
      list = list.filter(o => {
        const d = Number(o.discountPct || o.discount_pct || 0);
        return d >= this.selectedDiscountRange;
      });
    }

    if (this.showFlashOnly) {
      list = list.filter(o => o.flash === true || o.badgeType === 'FLASH' || o.is_flash === 1 || o.is_flash === true);
    }

    if (this.showFeaturedOnly) {
      list = list.filter(o => o.featured === true || o.badgeType === 'FEATURED' || o.is_featured === 1 || o.is_featured === true);
    }

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(o => {
        const tEn = (o.titleEn || o.title_en || '').toLowerCase();
        const tAr = (o.titleAr || o.title_ar || '').toLowerCase();
        const sEn = (o.storeNameEn || o.store_name_en || '').toLowerCase();
        const sAr = (o.storeNameAr || o.store_name_ar || '').toLowerCase();
        return tEn.includes(q) || tAr.includes(q) || sEn.includes(q) || sAr.includes(q);
      });
    }

    this.offers.set(list);
    this.cd.detectChanges();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCityId = null;
    this.selectedMainCategoryId = null;
    this.selectedSubCategoryId = null;
    this.selectedStoreId = null;
    this.selectedDiscountRange = 0;
    this.showFlashOnly = false;
    this.showFeaturedOnly = false;
    this.searchQuery = '';
    
    // Clear route query parameters
    this.router.navigate([], { queryParams: {} });
    this.applyFilters();
  }

  getSelectedMainCategory(): any | null {
    if (!this.selectedMainCategoryId) return null;
    return this.categories().find(c => Number(c.id) === Number(this.selectedMainCategoryId)) || null;
  }

  getSelectedSubCategory(): any | null {
    if (!this.selectedSubCategoryId) return null;
    return this.categories().find(c => Number(c.id) === Number(this.selectedSubCategoryId)) || null;
  }

  // Image & Logo Helpers
  getOfferImageUrl(item: any): string {
    if (!item) return this.getImageUrl(null);

    // 1. Dedicated Offer Image
    const offerImg = item.imageUrl || item.image_url || item.thumbnailUrl || item.thumbnail_url;
    if (offerImg && typeof offerImg === 'string' && offerImg.trim() !== '' && !offerImg.startsWith('data:image/svg')) {
      return this.getImageUrl(offerImg);
    }

    // 2. Product Image from DTO
    const dtoProdImg = item.productPrimaryImageUrl || 
                       item.product_primary_image_url || 
                       item.productImageUrl || 
                       item.product_image_url || 
                       item.product?.primaryImageUrl || 
                       item.product?.primary_image_url || 
                       item.product?.imageUrl;
    if (dtoProdImg && typeof dtoProdImg === 'string' && dtoProdImg.trim() !== '') {
      return this.getImageUrl(dtoProdImg);
    }

    // 3. Product Image from Product Map
    const pId = item.productId || item.product_id || item.product?.id;
    if (pId !== undefined && pId !== null && pId !== '') {
      const mappedProd = this.productMap()[Number(pId)] || this.productMap()[pId];
      if (mappedProd) {
        let prodImg = mappedProd.primaryImageUrl || mappedProd.primary_image_url || mappedProd.imageUrl || mappedProd.image_url;
        if ((!prodImg || typeof prodImg !== 'string' || prodImg.trim() === '') && mappedProd.images && Array.isArray(mappedProd.images) && mappedProd.images.length > 0) {
          const first = mappedProd.images[0];
          prodImg = typeof first === 'string' ? first : (first?.imageUrl || first?.image_url);
        }
        if (prodImg && typeof prodImg === 'string' && prodImg.trim() !== '') {
          return this.getImageUrl(prodImg);
        }
      }
    }

    return this.getImageUrl(null);
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Cpath fill='%23cbd5e1' d='M160 110a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm100 120H140l50-65 35 45 25-30 40 50z'/%3E%3Ctext x='50%25' y='82%25' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='500'%3EDealSpot%3C/text%3E%3C/svg%3E";
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

  getStoreLogoUrl(itemOrUrl: any, explicitStoreId?: number): string {
    let url: string | null = null;
    let storeId: number | null = explicitStoreId || null;

    if (typeof itemOrUrl === 'string') {
      url = itemOrUrl;
    } else if (itemOrUrl && typeof itemOrUrl === 'object') {
      url = itemOrUrl.storeLogoUrl || itemOrUrl.store_logo_url || itemOrUrl.store?.logoUrl || itemOrUrl.store?.logo_url || itemOrUrl.logoUrl || itemOrUrl.logo_url;
      storeId = storeId || itemOrUrl.storeId || itemOrUrl.store_id || itemOrUrl.store?.id || itemOrUrl.id;
    }

    // Fallback to storeMap lookup if url is empty
    if ((!url || url.trim() === '') && storeId && this.storeMap()[storeId]) {
      const st = this.storeMap()[storeId];
      url = st.logoUrl || st.logo_url;
    }

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='48' height='48'%3E%3Crect width='48' height='48' rx='10' fill='%23eff6ff'/%3E%3Cpath fill='%232563eb' d='M8 14l3-7h26l3 7v3h-2v23a2 2 0 01-2 2H12a2 2 0 01-2-2V17H8v-3zm6 0h20l-1.7-4H15.7L14 14zm18 6H16v18h16V20z'/%3E%3C/svg%3E";
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

  // Saved / Bookmarking Logic
  private loadSavedOffers(): void {
    if (this.authService.isAuthenticated()) {
      this.offerService.getMySavedOffers().subscribe({
        next: (savedOffers) => {
          if (Array.isArray(savedOffers)) {
            this.savedOfferIds.set(savedOffers.map((o: any) => Number(o.id)));
          }
          if (this.onlySaved()) {
            this.applyFilters();
          }
          this.cd.detectChanges();
        },
        error: () => {}
      });
    } else {
      this.savedOfferIds.set([]);
    }
  }

  isSaved(offerId: number): boolean {
    return this.savedOfferIds().includes(Number(offerId));
  }

  toggleSave(offer: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: this.currentLang() === 'en' ? 'Sign in Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en'
          ? 'Please log in to save offers to your favorites.'
          : 'يرجى تسجيل الدخول لحفظ العروض في المفضلة.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: this.currentLang() === 'en' ? 'Log In' : 'تسجيل الدخول',
        cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    const id = Number(offer.id);
    const wasSaved = this.isSaved(id);

    // Optimistic UI update
    if (wasSaved) {
      this.savedOfferIds.update(ids => ids.filter(i => i !== id));
      if (offer.saveCount && offer.saveCount > 0) offer.saveCount--;
    } else {
      this.savedOfferIds.update(ids => [...ids, id]);
      offer.saveCount = (offer.saveCount || 0) + 1;
    }

    if (this.onlySaved()) {
      this.applyFilters();
    }

    this.offerService.toggleSaveOffer(id).subscribe({
      next: (res) => {
        if (res && res.saveCount !== undefined) {
          offer.saveCount = res.saveCount;
        }
        this.cd.detectChanges();
      },
      error: () => {
        // Rollback on failure
        if (wasSaved) {
          this.savedOfferIds.update(ids => [...ids, id]);
          offer.saveCount = (offer.saveCount || 0) + 1;
        } else {
          this.savedOfferIds.update(ids => ids.filter(i => i !== id));
          if (offer.saveCount && offer.saveCount > 0) offer.saveCount--;
        }
        if (this.onlySaved()) {
          this.applyFilters();
        }
        this.cd.detectChanges();
      }
    });
  }

  toggleSavedOnly(): void {
    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: this.currentLang() === 'en' ? 'Sign in Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en'
          ? 'Please log in to view your saved offers.'
          : 'يرجى تسجيل الدخول لعرض العروض المحفوظة.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: this.currentLang() === 'en' ? 'Log In' : 'تسجيل الدخول',
        cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    this.onlySaved.set(!this.onlySaved());
    this.applyFilters();
  }


  shareOffer(offer: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const shareUrl = `${window.location.origin}/offers-list?search=${encodeURIComponent(offer.titleEn || offer.title_en || '')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.copiedOfferId = offer.id;
        setTimeout(() => {
          this.copiedOfferId = null;
          this.cd.detectChanges();
        }, 2000);
      });
    }
  }
}
