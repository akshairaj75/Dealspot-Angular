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

  currentLang = this.translationService.currentLang;
  appConfig = APP_CONFIG;

  searchQuery = '';
  searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  suggestedOffers = signal<any[]>([]);
  suggestedStores = signal<any[]>([]);
  suggestedProducts = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);

  isProfileOpen = false;
  isNotificationOpen = false;
  isCityModalOpen = false;

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
      debounceTime(250),
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

    if (!target.closest('.search-form') && !target.closest('.hero-search-container')) {
      this.closeSearchSuggestions();
    }

    if (!target.closest('.notif-dropdown-wrapper')) {
      this.isNotificationOpen = false;
    }

    if (!target.closest('.profile-dropdown-wrapper')) {
      this.isProfileOpen = false;
    }
  }

  private fetchSearchSuggestions(query: string): void {
    const cleanQ = (query || '').trim();
    if (cleanQ.length < 2) {
      this.suggestedOffers.set([]);
      this.suggestedStores.set([]);
      this.suggestedProducts.set([]);
      this.isSearching.set(false);
      this.showSuggestions.set(false);
      return;
    }

    this.isSearching.set(true);
    this.showSuggestions.set(true);

    // 1. Fetch matching products (most important)
    this.productService.getPagedProducts(0, 4, cleanQ).subscribe({
      next: (res) => {
        const list = res?.content || (Array.isArray(res) ? res : []);
        this.suggestedProducts.set(list.slice(0, 4));
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false)
    });

    // 2. Fetch matching offers
    this.offerService.getPagedOffers(0, 4, cleanQ).subscribe({
      next: (res) => {
        const list = res?.content || (Array.isArray(res) ? res : []);
        this.suggestedOffers.set(list.slice(0, 4));
      }
    });

    // 3. Fetch/filter matching stores
    this.storeService.getStores().subscribe({
      next: (stores) => {
        const qLower = cleanQ.toLowerCase();
        const filtered = (stores || []).filter((s: any) =>
          (s.nameEn && s.nameEn.toLowerCase().includes(qLower)) ||
          (s.nameAr && s.nameAr.toLowerCase().includes(qLower))
        ).slice(0, 3);
        this.suggestedStores.set(filtered);
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
    this.authService.logout('/');
  }

}