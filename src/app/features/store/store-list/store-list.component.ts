import { Component, inject, OnInit, OnDestroy, signal, effect, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { CategoryService } from '../../../core/services/category.service';
import { CityService } from '../../../core/services/city.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CustomSelectComponent, TranslatePipe],
  templateUrl: './store-list.component.html',
  styleUrls: ['./store-list.component.css']
})
export class StoreListComponent implements OnInit, OnDestroy {
  private storeService = inject(StoreService);
  private categoryService = inject(CategoryService);
  private cityService = inject(CityService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  translationService = inject(TranslationService);
  cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;

  stores = signal<any[]>([]);
  categories: any[] = [];
  cities = signal<any[]>([]);
  followedStoreIds = signal<number[]>([]);
  storeOffersCountMap = signal<Record<number, number>>({});

  // Mobile Filter Drawer State
  isMobileFilterOpen = signal<boolean>(false);
  activeFiltersCount = signal<number>(0);

  // Filter States
  searchQuery = '';
  selectedCityId: number | null = null;
  selectedCategoryId: number | null = null;
  onlyFollowed = signal<boolean>(false);
  onlyVerified = signal<boolean>(false);
  loading = false;
  filePath = environment.filePath;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && this.authService.isAuthenticated()) {
        this.loadFollowedStores();
      } else {
        this.followedStoreIds.set([]);
      }
    });

    effect(() => {
      const city = this.cityService.selectedCity();
      if (city && this.selectedCityId === null) {
        this.selectedCityId = city.id;
        this.calculateActiveFiltersCount();
      }
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data && data['onlyFollowed']) {
        this.onlyFollowed.set(true);
      }
    });

    this.cityService.getCities().subscribe((res: any) => {
      const list = Array.isArray(res) ? res : (res?.data || []);
      this.cities.set(list);
    });

    this.categoryService.getCategories().subscribe((res: any) => {
      const list: any[] = Array.isArray(res) ? res : (res?.data || []);
      const parentCategories = list.filter(
        (category: any) => category.parentId === null || category.parentId === undefined
      );
      this.categories = parentCategories;
    });

    this.loadStores();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMobileFilterOpen()) {
      this.closeMobileFilter();
    }
  }

  openMobileFilter(): void {
    this.isMobileFilterOpen.set(true);
    try {
      document.body.style.overflow = 'hidden';
    } catch (_) {}
  }

  closeMobileFilter(): void {
    this.isMobileFilterOpen.set(false);
    try {
      document.body.style.overflow = '';
    } catch (_) {}
  }

  applyMobileFilter(): void {
    this.calculateActiveFiltersCount();
    this.closeMobileFilter();
  }

  calculateActiveFiltersCount(): void {
    let count = 0;
    if (this.selectedCityId !== null) count++;
    if (this.selectedCategoryId !== null) count++;
    if (this.onlyFollowed()) count++;
    if (this.onlyVerified()) count++;
    if (this.searchQuery && this.searchQuery.trim().length > 0) count++;
    this.activeFiltersCount.set(count);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCityId = null;
    this.selectedCategoryId = null;
    this.onlyFollowed.set(false);
    this.onlyVerified.set(false);
    this.calculateActiveFiltersCount();
    this.cd.detectChanges();
  }

  ngOnDestroy(): void {
    try {
      document.body.style.overflow = '';
    } catch (_) {}
  }

  loadFollowedStores(): void {
    this.storeService.getMyFollowedStores().subscribe({
      next: (followedStores) => {
        if (Array.isArray(followedStores)) {
          this.followedStoreIds.set(followedStores.map((s: any) => s.id));
        }
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }

  loadStores(): void {
    this.loading = true;
    this.storeService.getStores().subscribe({
      next: (data) => {
        this.stores.set(data || []);
        this.calculateActiveFiltersCount();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  getLogoUrl(store: any): string {
    if (!store) return 'assets/images/placeholder-store.png';
    const url = typeof store === 'string' ? store : (store.logoUrl || store.logo_url || store.logo);
    if (!url) return 'assets/images/placeholder-store.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('assets/')) {
      return url;
    }
    const base = this.filePath || environment.filePath || '';
    if (base.endsWith('/') && url.startsWith('/')) {
      return base + url.substring(1);
    }
    if (!base.endsWith('/') && !url.startsWith('/')) {
      return base + '/' + url;
    }
    return base + url;
  }

  toggleFollowedOnly(): void {
    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: this.currentLang() === 'en' ? 'Sign in Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en'
          ? 'Please log in to view your followed stores.'
          : 'يرجى تسجيل الدخول لعرض المتاجر التي تتابعها.',
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
    this.onlyFollowed.set(!this.onlyFollowed());
    this.calculateActiveFiltersCount();
  }

  toggleVerifiedOnly(): void {
    this.onlyVerified.set(!this.onlyVerified());
    this.calculateActiveFiltersCount();
  }

  onFilterChange(): void {
    this.calculateActiveFiltersCount();
  }

  getSelectedCategory(): any | null {
    if (this.selectedCategoryId === null) return null;
    return this.categories.find(c => c.id === this.selectedCategoryId) || null;
  }

  getSelectedCity(): any | null {
    if (this.selectedCityId === null) return null;
    return this.cities().find(c => c.id === this.selectedCityId) || null;
  }

  getFilteredStores(): any[] {
    let filtered = [...this.stores()];

    if (this.onlyFollowed()) {
      filtered = filtered.filter(store => this.followedStoreIds().includes(store.id));
    }

    if (this.onlyVerified()) {
      filtered = filtered.filter(store => store.verified === true || store.isVerified === true || store.is_verified === 1);
    }

    if (this.selectedCityId !== null) {
      const cId = Number(this.selectedCityId);
      filtered = filtered.filter(store => store.cityId === cId || store.city_id === cId);
    }

    if (this.selectedCategoryId !== null) {
      const catId = Number(this.selectedCategoryId);
      filtered = filtered.filter(store => store.categoryId === catId || store.category_id === catId);
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(store =>
        store.nameEn?.toLowerCase().includes(query) ||
        store.nameAr?.toLowerCase().includes(query) ||
        store.cityNameEn?.toLowerCase().includes(query) ||
        store.cityNameAr?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  toggleFollow(store: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: this.currentLang() === 'en' ? 'Sign in Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en'
          ? 'Please log in to follow stores and receive instant deal alerts.'
          : 'يرجى تسجيل الدخول لمتابعة المتاجر وتلقي إشعارات العروض فوراً.',
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

    const wasFollowing = this.isFollowing(store.id);

    // Optimistic UI update
    if (wasFollowing) {
      this.followedStoreIds.update(ids => ids.filter(id => id !== store.id));
      if (store.followersCount > 0) store.followersCount--;
    } else {
      this.followedStoreIds.update(ids => [...ids, store.id]);
      store.followersCount = (store.followersCount || 0) + 1;
    }

    this.storeService.toggleFollow(store.id).subscribe({
      next: (res) => {
        store.followersCount = res.followersCount;
        this.cd.detectChanges();
      },
      error: (err) => {
        // Rollback on failure
        if (wasFollowing) {
          this.followedStoreIds.update(ids => [...ids, store.id]);
          store.followersCount = (store.followersCount || 0) + 1;
        } else {
          this.followedStoreIds.update(ids => ids.filter(id => id !== store.id));
          if (store.followersCount > 0) store.followersCount--;
        }
        this.cd.detectChanges();
      }
    });
  }

  isFollowing(storeId: number): boolean {
    return this.followedStoreIds().includes(storeId);
  }

  getOffersCount(storeId: number): number {
    return this.storeOffersCountMap()[storeId] || 0;
  }
}
