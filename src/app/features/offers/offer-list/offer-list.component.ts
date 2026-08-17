import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
// import { OfferService, OfferFilters } from '../../../core/services/offer.service';
import { CategoryService } from '../../../core/services/category.service';
// import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
// import { SavedOfferService } from '../../../core/services/saved-offer.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { Offer, Category, Store, City } from '../../../core/models';

@Component({
  selector: 'app-offer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './offer-list.component.html',
  styleUrls: ['./offer-list.component.css']
})
export class OfferListComponent implements OnInit {
  // private offerService = inject(OfferService);
  // private categoryService = inject(CategoryService);
  // private storeService = inject(StoreService);
  // private cityService = inject(CityService);
  // private savedOfferService = inject(SavedOfferService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentLang = inject(TranslationService).currentLang;

  offers = signal<any[]>([]);
  categories = signal<any[]>([]);
  stores = signal<any[]>([]);
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

  // constructor() {
  //   // Monitor active city signal globally
  //   effect(() => {
  //     const city = this.cityService.selectedCity();
  //     if (city) {
  //       this.selectedCityId = city.id;
  //       this.applyFilters();
  //     }
  //   });

  //   // Monitor login status to sync saves
  //   effect(() => {
  //     const user = this.authService.currentUser();
  //     if (user) {
  //       this.savedOfferService.getSavedOffers(user.id).subscribe(saves => {
  //         this.savedOfferIds.set(saves.map(s => s.offer_id));
  //       });
  //     } else {
  //       this.savedOfferIds.set([]);
  //     }
  //   });
  // }

  ngOnInit(): void {
    // Load dropdown options
    // this.categoryService.getCategories().subscribe(c => this.categories.set(c));
    // this.storeService.getStores().subscribe(s => this.stores.set(s));
    // this.cityService.getCities().subscribe(c => this.cities.set(c));

    // Handle query parameters (e.g. from Home page clicks)
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategoryId = Number(params['category']);
      }
      if (params['store']) {
        this.selectedStoreId = Number(params['store']);
      }
      if (params['flash']) {
        this.showFlashOnly = params['flash'] === 'true';
      }
      if (params['featured']) {
        this.showFeaturedOnly = params['featured'] === 'true';
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

  applyFilters(): void {
    this.loading = true;
    const filterParams: any = {
      cityId: this.selectedCityId || undefined,
      categoryId: this.selectedCategoryId || undefined,
      storeId: this.selectedStoreId || undefined,
      minDiscount: this.selectedDiscountRange || undefined,
      isFlash: this.showFlashOnly ? true : undefined,
      isFeatured: this.showFeaturedOnly ? true : undefined,
      search: this.searchQuery || undefined
    };
    console.log(filterParams);

    // this.offerService.getOffers(filterParams).subscribe({
    //   next: (res) => {
    //     this.offers.set(res);
    //     this.loading = false;
    //   },
    //   error: () => {
    //     this.loading = false;
    //   }
    // });
  }

  resetFilters(): void {
    this.selectedCategoryId = null;
    this.selectedStoreId = null;
    this.selectedDiscountRange = 0;
    this.showFlashOnly = false;
    this.showFeaturedOnly = false;
    this.searchQuery = '';
    
    // Maintain city selection but clear route parameters
    this.router.navigate([], { queryParams: {} });
    this.applyFilters();
  }

  toggleSave(offer: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    // const user = this.authService.currentUser();
    // if (!user) {
    //   alert('Please login to save offers.');
    //   return;
    // }

    const isSaved = this.savedOfferIds().includes(offer.id);
    // if (isSaved) {
    //   this.savedOfferService.unsaveOffer(user.id, offer.id).subscribe(() => {
    //     this.savedOfferIds.update(ids => ids.filter(id => id !== offer.id));
    //   });
    // } else {
    //   this.savedOfferService.saveOffer(user.id, offer.id).subscribe(() => {
    //     this.savedOfferIds.update(ids => [...ids, offer.id]);
    //   });
    // }
  }

  isSaved(offerId: number): boolean {
    return this.savedOfferIds().includes(offerId);
  }

  shareOffer(offer: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const shareUrl = `${window.location.origin}/offers/${offer.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!');
      });
    } else {
      alert(`Share this offer: ${shareUrl}`);
    }
  }
}

