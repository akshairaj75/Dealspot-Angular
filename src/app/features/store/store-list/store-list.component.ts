import { Component, inject, OnInit, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './store-list.component.html',
  styleUrls: ['./store-list.component.css']
})
export class StoreListComponent implements OnInit {
  private storeService = inject(StoreService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  translationService = inject(TranslationService);
  cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;

  stores = signal<any[]>([]);
  categories: any = [];
  followedStoreIds = signal<number[]>([]);
  storeOffersCountMap = signal<Record<number, number>>({});

  searchQuery = '';
  selectedCategoryId: number | null = null;
  onlyFollowed = signal<boolean>(false);
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
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data && data['onlyFollowed']) {
        this.onlyFollowed.set(true);
      }
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
  }

  getFilteredStores(): any[] {
    let filtered = [...this.stores()];

    if (this.onlyFollowed()) {
      filtered = filtered.filter(store => this.followedStoreIds().includes(store.id));
    }

    if (this.selectedCategoryId !== null) {
      filtered = filtered.filter(
        store => store.categoryId === this.selectedCategoryId
      );
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(store =>
        store.nameEn?.toLowerCase().includes(query) ||
        store.nameAr?.toLowerCase().includes(query)
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
