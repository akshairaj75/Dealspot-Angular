import { Component, inject, signal, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfferService } from '../../../core/services/offer.service';
import { CategoryService } from '../../../core/services/category.service';
import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';

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
  private cityService = inject(CityService);
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
  cities = signal<any[]>([]);
  savedOfferIds = signal<number[]>([]);

  // Filter States
  selectedCityId: number | null = null;
  selectedCategoryId: number | null = null;
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
  }

  ngOnInit(): void {
    this.loadSavedOffers();
    this.loadDropdowns();
    this.loadOffers();

    // Handle query parameters (from Home page or direct links)
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategoryId = Number(params['category']);
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

  loadDropdowns(): void {
    this.categoryService.getCategories().subscribe({
      next: (c: any) => {
        const list = Array.isArray(c) ? c : (c?.data || []);
        this.categories.set(list);
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

  applyFilters(): void {
    let list = this.rawOffers();

    // City Filter
    if (this.selectedCityId) {
      list = list.filter(o => !o.cityId || o.cityId === Number(this.selectedCityId) || o.city_id === Number(this.selectedCityId));
    }

    // Category Filter
    if (this.selectedCategoryId) {
      list = list.filter(o => o.categoryId === Number(this.selectedCategoryId) || o.category_id === Number(this.selectedCategoryId));
    }

    // Store Filter
    if (this.selectedStoreId) {
      list = list.filter(o => o.storeId === Number(this.selectedStoreId) || o.store_id === Number(this.selectedStoreId));
    }

    // Minimum Discount Range
    if (this.selectedDiscountRange > 0) {
      list = list.filter(o => {
        const pct = o.discountPct !== undefined ? o.discountPct : (o.discount_pct || 0);
        return pct >= this.selectedDiscountRange;
      });
    }

    // Flash Deals Only
    if (this.showFlashOnly) {
      list = list.filter(o => o.flash === true || o.badgeType === 'FLASH' || o.is_flash === 1 || o.is_flash === true);
    }

    // Featured Deals Only
    if (this.showFeaturedOnly) {
      list = list.filter(o => o.featured === true || o.badgeType === 'FEATURED' || o.is_featured === 1 || o.is_featured === true);
    }

    // Search Query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(o =>
        (o.titleEn && o.titleEn.toLowerCase().includes(q)) ||
        (o.titleAr && o.titleAr.toLowerCase().includes(q)) ||
        (o.title_en && o.title_en.toLowerCase().includes(q)) ||
        (o.title_ar && o.title_ar.toLowerCase().includes(q)) ||
        (o.storeNameEn && o.storeNameEn.toLowerCase().includes(q)) ||
        (o.storeNameAr && o.storeNameAr.toLowerCase().includes(q)) ||
        (o.store?.nameEn && o.store.nameEn.toLowerCase().includes(q)) ||
        (o.store?.nameAr && o.store.nameAr.toLowerCase().includes(q)) ||
        (o.categoryNameEn && o.categoryNameEn.toLowerCase().includes(q)) ||
        (o.descriptionEn && o.descriptionEn.toLowerCase().includes(q)) ||
        (o.descriptionAr && o.descriptionAr.toLowerCase().includes(q))
      );
    }

    this.offers.set(list);
  }

  resetFilters(): void {
    this.selectedCategoryId = null;
    this.selectedStoreId = null;
    this.selectedDiscountRange = 0;
    this.showFlashOnly = false;
    this.showFeaturedOnly = false;
    this.searchQuery = '';
    
    // Clear route query parameters
    this.router.navigate([], { queryParams: {} });
    this.applyFilters();
  }

  // Image & Logo Helpers
  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';
    }

    url = url.trim();

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    while (url.startsWith('/')) {
      url = url.substring(1);
    }

    let base = this.filePath || 'http://192.168.1.110:8080/';
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

    let base = this.filePath || 'http://192.168.1.110:8080/';
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
    try {
      const stored = localStorage.getItem('dealspot_saved_offers');
      if (stored) {
        this.savedOfferIds.set(JSON.parse(stored));
      }
    } catch {
      this.savedOfferIds.set([]);
    }
  }

  isSaved(offerId: number): boolean {
    return this.savedOfferIds().includes(offerId);
  }

  toggleSave(offer: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const id = offer.id;
    const current = [...this.savedOfferIds()];
    const index = current.indexOf(id);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }

    this.savedOfferIds.set(current);
    try {
      localStorage.setItem('dealspot_saved_offers', JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
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
