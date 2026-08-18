import { Component, inject, OnInit, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CityService } from '../../core/services/city.service';
import { CategoryService } from '../../core/services/category.service';
import { OfferService } from '../../core/services/offer.service';
import { FlyerService } from '../../core/services/flyer.service';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate-pipe';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  cityService = inject(CityService);
  categoryService = inject(CategoryService);
  offerService = inject(OfferService);
  flyerService = inject(FlyerService);
  translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  categories = signal<any[]>([]);
  allOffers = signal<any[]>([]);
  flashDeals = signal<any[]>([]);
  featuredOffers = signal<any[]>([]);
  latestOffers = signal<any[]>([]);
  activeFlyers = signal<any[]>([]);

  savedOfferIds = signal<number[]>([]);
  loading = signal<boolean>(true);

  constructor() {
    // When city changes, re-filter if desired
    effect(() => {
      const city = this.cityService.selectedCity();
      if (city) {
        this.filterByCity(city.id);
      }
    });
  }

  ngOnInit(): void {
    this.loadSavedOffers();
    this.loadRealData();
  }

  loadRealData(): void {
    this.loading.set(true);

    // 1. Categories
    this.categoryService.getCategories().subscribe({
      next: (res: any) => {
        const cats = Array.isArray(res) ? res : (res?.data || []);
        this.categories.set(cats);
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

  // Image & Logo Helpers
  getImageUrl(url: string | null | undefined): string {
    if (!url) {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getStoreLogoUrl(url: string | null | undefined): string {
    if (!url) {
      return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100&auto=format&fit=crop&q=60';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
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
    try {
      const stored = localStorage.getItem('dealspot_saved_offers');
      if (stored) {
        this.savedOfferIds.set(JSON.parse(stored));
      }
    } catch {
      this.savedOfferIds.set([]);
    }
  }

  isSaved(id: number): boolean {
    return this.savedOfferIds().includes(id);
  }

  toggleSaveOffer(offer: any, event: Event): void {
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
}