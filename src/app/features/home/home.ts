import { Component, inject, OnInit, signal, effect, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CityService } from '../../core/services/city.service';
import { CategoryService } from '../../core/services/category.service';
import { OfferService } from '../../core/services/offer.service';
import { FlyerService } from '../../core/services/flyer.service';
import { StoreService } from '../../core/services/store.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate-pipe';
import { environment } from '../../environment/environment';
import { APP_CONFIG } from '../../core/config/app-config';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  @ViewChild('catScrollContainer') catScrollContainer?: ElementRef<HTMLDivElement>;

  cityService = inject(CityService);
  categoryService = inject(CategoryService);
  offerService = inject(OfferService);
  flyerService = inject(FlyerService);
  storeService = inject(StoreService);
  authService = inject(AuthService);
  router = inject(Router);
  translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;
  appConfig = APP_CONFIG;

  categories = signal<any[]>([]);
  allOffers = signal<any[]>([]);
  flashDeals = signal<any[]>([]);
  featuredOffers = signal<any[]>([]);
  latestOffers = signal<any[]>([]);
  activeFlyers = signal<any[]>([]);
  storeMap = signal<Record<number, any>>({});

  savedOfferIds = signal<number[]>([]);
  loading = signal<boolean>(true);

  scrollCategories(offset: number): void {
    if (this.catScrollContainer?.nativeElement) {
      // In RTL mode, horizontal scroll direction can be reversed in some browsers
      const isRtl = this.currentLang() === 'ar';
      const actualOffset = isRtl ? -offset : offset;
      this.catScrollContainer.nativeElement.scrollBy({ left: actualOffset, behavior: 'smooth' });
    }
  }

  constructor() {
    // When city changes, re-filter if desired
    effect(() => {
      const city = this.cityService.selectedCity();
      if (city) {
        this.filterByCity(city.id);
      }
    });

    // Monitor user authentication to load saved offers from database
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
    this.loadSavedOffers();
    this.loadRealData();
  }


  loadRealData(): void {
    this.loading.set(true);

    // 0. Stores Map for Logo resolution
    this.storeService.getStores().subscribe({
      next: (stores: any[]) => {
        if (stores && Array.isArray(stores)) {
          const map: Record<number, any> = {};
          stores.forEach(s => {
            if (s && s.id) map[s.id] = s;
          });
          this.storeMap.set(map);
          this.cd.detectChanges();
        }
      },
      error: (err) => console.error('Failed to load stores:', err)
    });

    // 1. Categories
    this.categoryService.getCategories().subscribe({
      next: (res: any) => {
        const cats = Array.isArray(res) ? res : (res?.data || []);
        // Prioritize top-level main categories for home page showcase
        const mainCats = cats.filter((c: any) => !c.parentId && !c.parent_id);
        this.categories.set(mainCats.length > 0 ? mainCats : cats);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });

    // 2. Offers
    this.offerService.getAllOffers().subscribe({
      next: (res: any[]) => {
        const offers = res || [];
        this.allOffers.set(offers);
        this.organizeOffers(offers);
        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load offers:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });

    // 3. Flyers
    this.flyerService.getAllFlyers().subscribe({
      next: (res: any[]) => {
        this.activeFlyers.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load flyers:', err)
    });
  }

  private organizeOffers(offers: any[]): void {
    // Flash Deals (flash=true or badgeType=FLASH)
    const flash = offers.filter(o => 
      o.flash === true || 
      o.badgeType === 'FLASH' || 
      o.is_flash === 1 || 
      o.is_flash === true
    );
    this.flashDeals.set(flash);

    // Featured Offers (featured=true or badgeType=FEATURED)
    const featured = offers.filter(o => 
      o.featured === true || 
      o.badgeType === 'FEATURED' || 
      o.is_featured === 1 || 
      o.is_featured === true
    );
    this.featuredOffers.set(featured.length > 0 ? featured : offers.slice(0, 4));

    // Latest Offers (all active, newest first)
    const latest = [...offers].filter(o => o.active !== false && o.is_active !== 0);
    this.latestOffers.set(latest.slice(0, 8));
  }

  private filterByCity(cityId: number): void {
    const all = this.allOffers();
    if (!all || all.length === 0) return;

    const cityOffers = all.filter(o => !o.cityId || o.cityId === cityId || o.city_id === cityId);
    if (cityOffers.length > 0) {
      this.organizeOffers(cityOffers);
    } else {
      this.organizeOffers(all);
    }
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

  getOfferImageUrl(item: any): string {
    if (!item) return this.getImageUrl(null);

    // 1. Dedicated Offer Image
    const offerImg = item.imageUrl || item.image_url || item.thumbnailUrl || item.thumbnail_url;
    if (offerImg && typeof offerImg === 'string' && offerImg.trim() !== '' && !offerImg.startsWith('data:image/svg')) {
      return this.getImageUrl(offerImg);
    }

    // 2. Product Image from DTO or embedded Product
    const dtoProdImg = item.productPrimaryImageUrl || 
                       item.product_primary_image_url || 
                       item.productImageUrl || 
                       item.product_image_url || 
                       item.product?.primaryImageUrl || 
                       item.product?.primary_image_url || 
                       item.product?.imageUrl ||
                       (item.product?.images && item.product.images.length > 0 ? (item.product.images[0]?.imageUrl || item.product.images[0]?.image_url || item.product.images[0]) : null);
    if (dtoProdImg && typeof dtoProdImg === 'string' && dtoProdImg.trim() !== '') {
      return this.getImageUrl(dtoProdImg);
    }

    return this.getImageUrl(null);
  }

  getCategoryImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '';
    }
    return this.getImageUrl(url);
  }

  getCategoryIcon(slug: string | null | undefined): string {
    if (!slug) return 'category';
    const iconMap: Record<string, string> = {
      'groceries': 'shopping_cart',
      'grocery': 'shopping_cart',
      'electronics': 'devices',
      'fashion': 'checkroom',
      'clothing': 'checkroom',
      'restaurants': 'restaurant',
      'food': 'restaurant',
      'health': 'health_and_safety',
      'beauty': 'face',
      'home': 'home',
      'furniture': 'chair',
      'sports': 'fitness_center',
      'automotive': 'directions_car'
    };
    const key = slug.toLowerCase().trim();
    return iconMap[key] || 'category';
  }

  // Bookmarking / Saved Offers
  private loadSavedOffers(): void {
    if (this.authService.isAuthenticated()) {
      this.offerService.getMySavedOffers().subscribe({
        next: (savedOffers) => {
          if (Array.isArray(savedOffers)) {
            this.savedOfferIds.set(savedOffers.map((o: any) => Number(o.id)));
          }
          this.cd.detectChanges();
        },
        error: () => {}
      });
    } else {
      this.savedOfferIds.set([]);
    }
  }

  isSaved(id: number): boolean {
    return this.savedOfferIds().includes(Number(id));
  }

  toggleSaveOffer(offer: any, event: Event): void {
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
        this.cd.detectChanges();
      }
    });
  }
}