import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { OfferService } from '../../../core/services/offer.service';
import { FlyerService } from '../../../core/services/flyer.service';
import { ProductService } from '../../../core/services/product.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';

type StoreTab = 'offers' | 'flyers' | 'branches';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './store-detail.component.html',
  styleUrls: ['./store-detail.component.css']
})
export class StoreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private offerService = inject(OfferService);
  private flyerService = inject(FlyerService);
  private productService = inject(ProductService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  store = signal<any | null>(null);
  offers = signal<any[]>([]);
  flyers = signal<any[]>([]);
  branches = signal<any[]>([]);
  productMap = signal<Record<number, any>>({});
  
  isFollowing = signal<boolean>(false);
  activeTab = signal<StoreTab>('offers');
  loading = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        this.loadStoreDetails(id);
        this.checkFollowStatus(id);
      }
    });
  }

  loadStoreDetails(id: number): void {
    this.loading = true;
    this.storeService.getStoreById(id).subscribe({
      next: (storeData) => {
        if (!storeData) {
          this.loading = false;
          this.cd.detectChanges();
          return;
        }
        this.store.set(storeData);

        // Fetch Store Branches
        this.storeService.getBranches(id).subscribe({
          next: (b) => {
            this.branches.set(b || []);
            this.cd.detectChanges();
          },
          error: (err) => {
            console.warn('Could not load branches:', err);
          }
        });

        // Fetch Offers for this store
        this.offerService.getAllOffers().subscribe({
          next: (allOffers: any[]) => {
            const matchedOffers = (allOffers || []).filter(o => 
              o.storeId === id || o.store_id === id || (o.store && o.store.id === id)
            );
            this.offers.set(matchedOffers);
            this.cd.detectChanges();
          },
          error: (err) => {
            console.warn('Could not load offers:', err);
          }
        });

        // Fetch Products for real image fallback
        this.productService.getProducts().subscribe({
          next: (prods: any[]) => {
            const map: Record<number, any> = {};
            (prods || []).forEach((p: any) => {
              if (p && p.id) map[p.id] = p;
            });
            this.productMap.set(map);
            this.cd.detectChanges();
          },
          error: () => {}
        });

        // Fetch Flyers for this store
        this.flyerService.getAllFlyers().subscribe({
          next: (allFlyers: any[]) => {
            const matchedFlyers = (allFlyers || []).filter(f => 
              f.storeId === id || f.store_id === id || (f.store && f.store.id === id)
            );
            this.flyers.set(matchedFlyers);
            this.cd.detectChanges();
          },
          error: (err) => {
            console.warn('Could not load flyers:', err);
          }
        });

        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load store:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  private checkFollowStatus(storeId: number): void {
    const followed = JSON.parse(localStorage.getItem('dealspot_followed_stores') || '[]');
    this.isFollowing.set(followed.includes(storeId));
  }

  toggleFollow(): void {
    const currentStore = this.store();
    if (!currentStore) return;

    const storeId = currentStore.id;
    let followed: number[] = JSON.parse(localStorage.getItem('dealspot_followed_stores') || '[]');

    if (this.isFollowing()) {
      followed = followed.filter(id => id !== storeId);
      this.isFollowing.set(false);
    } else {
      if (!followed.includes(storeId)) {
        followed.push(storeId);
      }
      this.isFollowing.set(true);
    }

    localStorage.setItem('dealspot_followed_stores', JSON.stringify(followed));
  }

  switchTab(tab: StoreTab): void {
    this.activeTab.set(tab);
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) {
      return 'https://placehold.co/120x120?text=No+Logo';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getOfferImageUrl(item: any): string {
    if (!item) return this.getImageUrl(null);

    // 1. Dedicated Offer Image
    const offerImg = item.imageUrl || item.image_url || item.thumbnailUrl || item.thumbnail_url;
    if (offerImg && typeof offerImg === 'string' && offerImg.trim() !== '' && !offerImg.startsWith('data:image/svg')) {
      return this.getImageUrl(offerImg);
    }

    // 2. Product Image from DTO
    const dtoProdImg = item.productPrimaryImageUrl || 
                       item.product_primary_image_url || 
                       item.productImageUrl || 
                       item.product_image_url || 
                       item.product?.primaryImageUrl || 
                       item.product?.primary_image_url || 
                       item.product?.imageUrl;
    if (dtoProdImg && typeof dtoProdImg === 'string' && dtoProdImg.trim() !== '') {
      return this.getImageUrl(dtoProdImg);
    }

    // 3. Product Image from Product Map
    const pId = item.productId || item.product_id || item.product?.id;
    if (pId !== undefined && pId !== null && pId !== '') {
      const mappedProd = this.productMap()[Number(pId)] || this.productMap()[pId];
      if (mappedProd) {
        let prodImg = mappedProd.primaryImageUrl || mappedProd.primary_image_url || mappedProd.imageUrl || mappedProd.image_url;
        if ((!prodImg || typeof prodImg !== 'string' || prodImg.trim() === '') && mappedProd.images && Array.isArray(mappedProd.images) && mappedProd.images.length > 0) {
          const first = mappedProd.images[0];
          prodImg = typeof first === 'string' ? first : (first?.imageUrl || first?.image_url);
        }
        if (prodImg && typeof prodImg === 'string' && prodImg.trim() !== '') {
          return this.getImageUrl(prodImg);
        }
      }
    }

    return this.getImageUrl(null);
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Cpath fill='%23cbd5e1' d='M160 110a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm100 120H140l50-65 35 45 25-30 40 50z'/%3E%3Ctext x='50%25' y='82%25' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='500'%3EDealSpot%3C/text%3E%3C/svg%3E";
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }
}
