import { Component, inject, signal, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslatePipe } from '../../shared/pipes/translate-pipe';
import { TranslationService } from '../../core/services/translation.service';
import { CityService } from '../../core/services/city.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { OfferService } from '../../core/services/offer.service';
import { StoreService } from '../../core/services/store.service';
import { ProductService } from '../../core/services/product.service';
import { FlyerService } from '../../core/services/flyer.service';
import { APP_CONFIG } from '../../core/config/app-config';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    TranslatePipe
  ],
  templateUrl: './public-layout.html',
  styleUrls: ['./public-layout.css']
})
export class PublicLayoutComponent implements OnInit, OnDestroy {

  router = inject(Router);
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  notificationService = inject(NotificationService);
  offerService = inject(OfferService);
  storeService = inject(StoreService);
  productService = inject(ProductService);
  flyerService = inject(FlyerService);

  currentLang = this.translationService.currentLang;
  appConfig = APP_CONFIG;

  searchQuery = '';
  searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  isSearchOverlayOpen = signal<boolean>(false);
  suggestedOffers = signal<any[]>([]);
  suggestedStores = signal<any[]>([]);
  suggestedProducts = signal<any[]>([]);
  suggestedFlyers = signal<any[]>([]);
  recentSearches = signal<string[]>([]);
  isSearching = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);

  trendingSearches = [
    { en: 'iPhone 16 Pro', ar: 'آيفون 16 برو' },
    { en: 'Lulu Hypermarket', ar: 'لولو هايبرماركت' },
    { en: 'Smart TVs', ar: 'شاشات ذكية' },
    { en: 'Panda Offers', ar: 'عروض بنده' },
    { en: 'Grocery Discounts', ar: 'عروض المقاضي' },
    { en: 'AirPods & Audio', ar: 'سماعات ايربودز' },
    { en: 'Perfumes & Oud', ar: 'عطور وبخور' },
    { en: 'Carrefour Deals', ar: 'عروض كارفور' }
  ];

  quickCategories = [
    { nameEn: 'All Offers', nameAr: 'جميع العروض', icon: 'local_offer', route: '/offers-list' },
    { nameEn: 'Flyers & Booklets', nameAr: 'المجلات والبروشورات', icon: 'menu_book', route: '/flyers' },
    { nameEn: 'Browse Stores', nameAr: 'تصفح المتاجر', icon: 'storefront', route: '/stores' }
  ];

  isProfileOpen = false;
  isMobileProfileOpen = false;
  isNotificationOpen = false;
  isCityModalOpen = false;
  currentYear = new Date().getFullYear();

  unreadNotificationsCount = this.notificationService.unreadCount;
  recentNotifications = this.notificationService.recentNotifications;

  // Authentication State directly from AuthService
  currentUser = this.authService.currentUser;
  isLoggedIn = this.authService.isAuthenticated;
  isAdmin = this.authService.isAdmin;

  cityService = inject(CityService);

  activeCity = this.cityService.selectedCity;
  cities = signal<any[]>([]);

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      this.refreshNotifications();
    }

    this.loadRecentSearches();

    this.cityService.getCities().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.cities.set(res);
          // If activeCity not set or not in list, pick first
          const current = this.cityService.selectedCity();
          if (!current || !res.find((c: any) => c.id === current.id)) {
            this.cityService.setSelectedCity(res[0]);
          }
        }
      },
      error: (err) => console.error('Failed to load cities:', err)
    });

    // Debounced search on key up
    this.searchSub = this.searchSubject.pipe(
      debounceTime(220),
      distinctUntilChanged()
    ).subscribe(query => {
      this.fetchSearchSuggestions(query);
    });
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  openSearchOverlay(): void {
    this.isSearchOverlayOpen.set(true);
    this.loadRecentSearches();
    if (this.searchQuery && this.searchQuery.trim().length >= 2) {
      this.fetchSearchSuggestions(this.searchQuery);
    }
    setTimeout(() => {
      const input = document.getElementById('fullscreen-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 120);
  }

  closeSearchOverlay(): void {
    this.isSearchOverlayOpen.set(false);
    this.showSuggestions.set(false);
  }

  loadRecentSearches(): void {
    try {
      const saved = localStorage.getItem('dealspot_recent_searches');
      if (saved) {
        this.recentSearches.set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read recent searches:', e);
    }
  }

  saveRecentSearch(term: string): void {
    const clean = (term || '').trim();
    if (!clean) return;
    try {
      const current = this.recentSearches().filter(s => s.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...current].slice(0, 10);
      this.recentSearches.set(updated);
      localStorage.setItem('dealspot_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save recent search:', e);
    }
  }

  removeRecentSearch(term: string, event: MouseEvent): void {
    event.stopPropagation();
    try {
      const updated = this.recentSearches().filter(s => s !== term);
      this.recentSearches.set(updated);
      localStorage.setItem('dealspot_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not remove recent search:', e);
    }
  }

  clearRecentSearches(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.recentSearches.set([]);
    try {
      localStorage.removeItem('dealspot_recent_searches');
    } catch (e) {
      console.warn('Could not clear recent searches:', e);
    }
  }

  applySearch(term: string): void {
    const clean = (term || '').trim();
    if (!clean) return;
    this.searchQuery = clean;
    this.saveRecentSearch(clean);
    this.closeSearchOverlay();
    this.closeSearchSuggestions();
    this.router.navigate(['/offers-list'], { queryParams: { q: clean } });
  }

  clearSearchQuery(): void {
    this.searchQuery = '';
    this.suggestedOffers.set([]);
    this.suggestedStores.set([]);
    this.suggestedProducts.set([]);
    this.suggestedFlyers.set([]);
    this.showSuggestions.set(false);
    const input = document.getElementById('fullscreen-search-input') as HTMLInputElement;
    if (input) input.focus();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onSearchFocus(): void {
    if (this.searchQuery && this.searchQuery.trim().length >= 2) {
      this.showSuggestions.set(true);
      this.searchSubject.next(this.searchQuery);
    }
  }

  closeSearchSuggestions(): void {
    this.showSuggestions.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    if (!target.closest('.search-form') && !target.closest('.hero-search-container') && !target.closest('.search-fullscreen-overlay')) {
      this.closeSearchSuggestions();
    }

    if (!target.closest('.notif-dropdown-wrapper')) {
      this.isNotificationOpen = false;
    }

    if (!target.closest('.profile-dropdown-wrapper')) {
      this.isProfileOpen = false;
    }
  }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    if (this.isSearchOverlayOpen()) {
      this.closeSearchOverlay();
    }
    this.closeSearchSuggestions();
  }

  private fetchSearchSuggestions(query: string): void {
    const cleanQ = (query || '').trim();
    if (cleanQ.length < 2) {
      this.suggestedOffers.set([]);
      this.suggestedStores.set([]);
      this.suggestedProducts.set([]);
      this.suggestedFlyers.set([]);
      this.isSearching.set(false);
      this.showSuggestions.set(false);
      return;
    }

    this.isSearching.set(true);
    this.showSuggestions.set(true);

    // 1. Fetch matching products
    this.productService.getPagedProducts(0, 6, cleanQ).subscribe({
      next: (res) => {
        const list = res?.content || (Array.isArray(res) ? res : []);
        this.suggestedProducts.set(list.slice(0, 6));
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false)
    });

    // 2. Fetch matching offers
    this.offerService.getPagedOffers(0, 6, cleanQ).subscribe({
      next: (res) => {
        const list = res?.content || (Array.isArray(res) ? res : []);
        this.suggestedOffers.set(list.slice(0, 6));
      }
    });

    // 3. Fetch/filter matching stores
    this.storeService.getStores().subscribe({
      next: (stores) => {
        const qLower = cleanQ.toLowerCase();
        const filtered = (stores || []).filter((s: any) =>
          (s.nameEn && s.nameEn.toLowerCase().includes(qLower)) ||
          (s.nameAr && s.nameAr.toLowerCase().includes(qLower))
        ).slice(0, 4);
        this.suggestedStores.set(filtered);
      }
    });

    // 4. Fetch/filter matching flyers
    this.flyerService.getAllFlyers().subscribe({
      next: (flyers) => {
        const qLower = cleanQ.toLowerCase();
        const filtered = (flyers || []).filter((f: any) =>
          (f.titleEn && f.titleEn.toLowerCase().includes(qLower)) ||
          (f.titleAr && f.titleAr.toLowerCase().includes(qLower)) ||
          (f.storeNameEn && f.storeNameEn.toLowerCase().includes(qLower)) ||
          (f.storeNameAr && f.storeNameAr.toLowerCase().includes(qLower))
        ).slice(0, 4);
        this.suggestedFlyers.set(filtered);
      }
    });
  }

  getProductImageUrl(product: any): string {
    const raw = product?.primaryImageUrl || (product?.images && product.images.length > 0 ? product.images[0].imageUrl : null);
    if (!raw) return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=60';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${environment.apiUrl.replace('/api/dealspot', '')}/${raw.startsWith('/') ? raw.substring(1) : raw}`;
  }

  getOfferImageUrl(offer: any): string {
    const raw = offer?.imageUrl || offer?.primaryImageUrl || offer?.image_url;
    if (!raw) return 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&auto=format&fit=crop&q=60';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${environment.apiUrl.replace('/api/dealspot', '')}/${raw.startsWith('/') ? raw.substring(1) : raw}`;
  }

  getStoreLogoUrl(store: any): string {
    const raw = store?.logoUrl || store?.storeLogoUrl || store?.logo_url;
    if (!raw) return 'https://images.unsplash.com/photo-1534723480100-2d884f3c7efd?w=100&auto=format&fit=crop&q=60';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${environment.apiUrl.replace('/api/dealspot', '')}/${raw.startsWith('/') ? raw.substring(1) : raw}`;
  }

  getFlyerImageUrl(flyer: any): string {
    const raw = flyer?.coverImageUrl || flyer?.cover_image_url;
    if (!raw) return 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&auto=format&fit=crop&q=60';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return environment.filePath + raw;
  }

  refreshNotifications(): void {
    this.notificationService.fetchUnreadCount().subscribe();
    this.notificationService.getMyNotifications(0, 5).subscribe();
  }

  toggleNotificationDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileOpen = false;
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) {
      this.refreshNotifications();
    }
  }

  onNotificationClick(item: any) {
    if (!item.read) {
      this.notificationService.markAsRead(item.id).subscribe();
    }
    this.closeDropdowns();
    if (item.deepLink) {
      this.router.navigateByUrl(item.deepLink);
    }
  }

  onMarkAllRead(event: MouseEvent) {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe();
  }

  toggleProfileDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isNotificationOpen = false;
    this.isProfileOpen = !this.isProfileOpen;
  }

  toggleMobileProfile(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isMobileProfileOpen = !this.isMobileProfileOpen;
    this.closeDropdowns();
  }

  closeMobileProfile() {
    this.isMobileProfileOpen = false;
  }

  closeDropdowns() {
    this.isProfileOpen = false;
    this.isNotificationOpen = false;
  }

  selectCity(city: any) {
    this.cityService.setSelectedCity(city);
    this.isCityModalOpen = false;
  }

  onSearchSubmit() {
    if (!this.searchQuery.trim()) return;
    this.closeSearchSuggestions();
    this.router.navigate(['/offers-list'], { queryParams: { q: this.searchQuery.trim() } });
  }

  toggleLanguage() {
    this.translationService.toggleLanguage();
  }

  logout() {
    this.closeDropdowns();
    this.closeMobileProfile();
    this.authService.logout('/');
  }

}