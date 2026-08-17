import { Component, inject, OnInit, signal, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { CategoryService } from '../../../core/services/category.service';
// import { StoreFollowService } from '../../../core/services/store-follow.service';
// import { OfferService } from '../../../core/services/offer.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { Store, Category } from '../../../core/models';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './store-list.component.html',
  styleUrls: ['./store-list.component.css']
})
export class StoreListComponent implements OnInit {
  private storeService = inject(StoreService);
  private categoryService = inject(CategoryService);
  // private followService = inject(StoreFollowService);
  // private offerService = inject(OfferService);
  private authService = inject(AuthService);
  private router = inject(Router);
  translationService = inject(TranslationService);
  cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;

  stores = signal<any[]>([]);
  categories: any = [];
  followedStoreIds = signal<number[]>([]);
  storeOffersCountMap = signal<Record<number, number>>({});

  searchQuery = '';
  selectedCategoryId: number | null = null;
  loading = false;
  filePath = environment.filePath;

    constructor() {
  // Monitor user login state to sync store follows
  // effect(() => {
  //   const user = this.authService.currentUser();
  //   if (user) {
  //     this.followService.getFollowedStores(user.id).subscribe(follows => {
  //       this.followedStoreIds.set(follows.map(f => f.store_id));
  //     });
  //   } else {
  //     this.followedStoreIds.set([]);
  //   }
  // });
}

ngOnInit(): void {
  this.categoryService.getCategories().subscribe((res: any[]) => {

    const parentCategories = res.filter(
      category => category.parentId === null
    );

    console.log(parentCategories);

    this.categories = parentCategories;
    console.log(' cat', this.categories);
  });

  this.loadStores();
}
loadStores(): void {
  this.loading = true;
  this.storeService.getStores().subscribe({
    next: (data) => {
      this.stores.set(data);
      console.log(data)
      this.loading = false;
      this.cd.detectChanges()

      // Fetch counts for badges
      // this.offerService.getOffers().subscribe(offers => {
      //   const counts: Record<number, number> = {};
      //   offers.forEach(o => {
      //     counts[o.store_id] = (counts[o.store_id] || 0) + 1;
      //   });
      //   this.storeOffersCountMap.set(counts);
      // });
    },
    error: () => {
      this.loading = false;
    }
  });
}

getFilteredStores(): any[] {
  let filtered = [...this.stores()];

  // Category Filter
  if (this.selectedCategoryId !== null) {
    filtered = filtered.filter(
      store => store.categoryId === this.selectedCategoryId
    );
  }

  // Search Filter
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

  // const user = this.authService.currentUser();
  // if (!user) {
  //   alert('Please login to follow stores.');
  //   this.router.navigate(['/login']);
  //   return;
  // }

  const isFollowing = this.followedStoreIds().includes(store.id);
  // if (isFollowing) {
  //   this.followService.unfollowStore(user.id, store.id).subscribe(() => {
  //     this.followedStoreIds.update(ids => ids.filter(id => id !== store.id));
  //   });
  // } else {
  //   this.followService.followStore(user.id, store.id).subscribe(() => {
  //     this.followedStoreIds.update(ids => [...ids, store.id]);
  //   });
  // }
}

isFollowing(storeId: number): boolean {
  return this.followedStoreIds().includes(storeId);
}

getOffersCount(storeId: number): number {
  return this.storeOffersCountMap()[storeId] || 0;
}
}
