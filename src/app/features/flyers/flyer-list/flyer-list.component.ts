import { Component, inject, OnInit, signal, effect, ChangeDetectorRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlyerService } from '../../../core/services/flyer.service';
import { CityService } from '../../../core/services/city.service';
import { StoreService } from '../../../core/services/store.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-flyer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, CustomSelectComponent],
  templateUrl: './flyer-list.component.html',
  styleUrls: ['./flyer-list.component.css']
})
export class FlyerListComponent implements OnInit {
  private flyerService = inject(FlyerService);
  private storeService = inject(StoreService);
  cityService = inject(CityService);
  private translationService = inject(TranslationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  flyers = signal<any[]>([]);
  cities = signal<any[]>([]);
  stores = signal<any[]>([]);
  selectedCityId = signal<number | null>(null);
  selectedStoreId = signal<number | null>(null);
  searchQuery = '';
  sortBy = signal<string>('newest');
  loading = false;

  sortOptions = computed(() => [
    { value: 'newest', nameEn: 'Newest Added', nameAr: 'الأحدث إضافة', icon: 'schedule' },
    { value: 'expiring', nameEn: 'Expiring Soon', nameAr: 'ينتهي قريباً', icon: 'alarm' },
    { value: 'popular', nameEn: 'Most Viewed', nameAr: 'الأكثر مشاهدة', icon: 'visibility' },
    { value: 'pages', nameEn: 'Most Pages', nameAr: 'الأكثر صفحات', icon: 'auto_stories' }
  ]);

  constructor() {
    effect(() => {
      const city = this.cityService.selectedCity();
      if (city && city.id && this.selectedCityId() === null && !this.route.snapshot.queryParams['city']) {
        this.selectedCityId.set(city.id);
        this.cd.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.loadCities();
    this.loadStores();
    this.loadFlyers();

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || params['search'] || '';
      this.selectedStoreId.set((params['store'] || params['storeId']) ? Number(params['store'] || params['storeId']) : null);
      if (params['city'] || params['cityId']) {
        this.selectedCityId.set(Number(params['city'] || params['cityId']));
      }
      if (params['sort']) {
        this.sortBy.set(params['sort']);
      }
      this.cd.detectChanges();
    });
  }

  loadCities(): void {
    this.cityService.getCities().subscribe({
      next: (res) => {
        if (res && Array.isArray(res)) {
          this.cities.set(res);
          this.cd.detectChanges();
        }
      },
      error: (err) => console.error('Failed to load cities for flyer filter:', err)
    });
  }

  loadStores(): void {
    this.storeService.getStores().subscribe({
      next: (res) => {
        if (res && Array.isArray(res)) {
          this.stores.set(res);
          this.cd.detectChanges();
        }
      },
      error: (err) => console.error('Failed to load stores for flyer filter:', err)
    });
  }

  loadFlyers(): void {
    this.loading = true;
    this.flyerService.getAllFlyers().subscribe({
      next: (res) => {
        this.flyers.set(res || []);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flyers:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  selectCity(cityId: number | null): void {
    this.selectedCityId.set(cityId);
  }

  getSelectedCityName(): string {
    const id = this.selectedCityId();
    if (id === null) return this.currentLang() === 'en' ? 'All Cities' : 'جميع المدن';
    const found = this.cities().find(c => c.id === id);
    if (!found) return this.currentLang() === 'en' ? 'Selected City' : 'المدينة المحددة';
    return this.currentLang() === 'ar' ? (found.nameAr || found.name_ar || found.nameEn) : (found.nameEn || found.name_en || found.nameAr);
  }

  clearCityFilter(): void {
    this.selectedCityId.set(null);
  }

  isNationwide(flyer: any): boolean {
    if (flyer.nationwide === true || flyer.isNationwide === true) return true;
    const cId = flyer.cityId ?? flyer.city_id ?? flyer.city?.id;
    return !cId;
  }

  getCityBadgeText(flyer: any): string {
    if (this.isNationwide(flyer)) {
      return this.currentLang() === 'en' ? 'All Cities' : 'جميع المدن';
    }
    if (this.currentLang() === 'ar') {
      return flyer.cityNameAr || flyer.city?.nameAr || flyer.city_name_ar || flyer.cityNameEn || flyer.city?.nameEn || 'المدينة';
    }
    return flyer.cityNameEn || flyer.city?.nameEn || flyer.city_name_en || flyer.cityNameAr || 'City';
  }

  getFilteredFlyers(): any[] {
    const today = new Date().toISOString().split('T')[0];
    let list = this.flyers().filter(f => {
      const isActive = f.active !== false && f.is_active !== 0 && f.isActive !== false;
      const isNotExpired = !f.isExpired && !(f.validUntil && f.validUntil < today) && !(f.valid_until && f.valid_until < today);
      return isActive && isNotExpired;
    });

    const activeCityId = this.selectedCityId();
    if (activeCityId !== null) {
      const cId = Number(activeCityId);
      list = list.filter(f => {
        if (this.isNationwide(f)) return true;
        const flyerCityId = f.cityId ?? f.city_id ?? f.city?.id;
        const storeCityId = f.store?.cityId ?? f.store?.city_id;
        return flyerCityId === cId || storeCityId === cId;
      });
    }

    const activeStoreId = this.selectedStoreId();
    if (activeStoreId !== null) {
      const sId = Number(activeStoreId);
      list = list.filter(f => {
        const flyerStoreId = f.storeId ?? f.store_id ?? f.store?.id;
        return Number(flyerStoreId) === sId;
      });
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(f => {
        const titleEn = (f.titleEn || f.title_en || '').toLowerCase();
        const titleAr = (f.titleAr || f.title_ar || '').toLowerCase();
        const storeNameEn = (f.storeNameEn || f.store?.nameEn || f.store?.name_en || '').toLowerCase();
        const storeNameAr = (f.storeNameAr || f.store?.nameAr || f.store?.name_ar || '').toLowerCase();
        const cityNameEn = (f.cityNameEn || f.city?.nameEn || '').toLowerCase();
        const cityNameAr = (f.cityNameAr || f.city?.nameAr || '').toLowerCase();
        return titleEn.includes(q) || titleAr.includes(q) || storeNameEn.includes(q) || storeNameAr.includes(q) || cityNameEn.includes(q) || cityNameAr.includes(q);
      });
    }

    // Sort
    const sort = this.sortBy();
    list = [...list].sort((a, b) => {
      if (sort === 'expiring') {
        const dateA = a.validUntil || a.valid_until || '9999-12-31';
        const dateB = b.validUntil || b.valid_until || '9999-12-31';
        return dateA.localeCompare(dateB);
      } else if (sort === 'popular') {
        const viewsA = a.viewCount || a.view_count || 0;
        const viewsB = b.viewCount || b.view_count || 0;
        return viewsB - viewsA;
      } else if (sort === 'pages') {
        const pagesA = a.totalPages || a.total_pages || (a.pages ? a.pages.length : 1);
        const pagesB = b.totalPages || b.total_pages || (b.pages ? b.pages.length : 1);
        return pagesB - pagesA;
      } else {
        // newest (default)
        return (b.id || 0) - (a.id || 0);
      }
    });

    return list;
  }

  getImageUrl(url: string | null | undefined, fallback: string = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&auto=format&fit=crop&q=60'): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return 'https://placehold.co/80x80?text=Logo';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }
}
