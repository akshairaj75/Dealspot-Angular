import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { OfferService } from '../../../core/services/offer.service';
import { FlyerService } from '../../../core/services/flyer.service';
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
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  store = signal<any | null>(null);
  offers = signal<any[]>([]);
  flyers = signal<any[]>([]);
  branches = signal<any[]>([]);
  
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

  getImageUrl(url: string | null | undefined, fallback: string = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'): string {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }
}
