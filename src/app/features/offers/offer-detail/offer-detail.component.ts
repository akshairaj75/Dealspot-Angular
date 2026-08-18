import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OfferService } from '../../../core/services/offer.service';
import { CouponService } from '../../../core/services/coupon.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './offer-detail.component.html',
  styleUrls: ['./offer-detail.component.css']
})
export class OfferDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private offerService = inject(OfferService);
  private couponService = inject(CouponService);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  offer = signal<any | null>(null);
  product = signal<any | null>(null);
  coupon = signal<any | null>(null);
  productSpecs = signal<any[]>([]);
  branches = signal<any[]>([]);
  images = signal<string[]>([]);
  activeImage = signal<string>('');

  isSaved = signal<boolean>(false);
  loading = signal<boolean>(true);
  couponCopied = false;
  couponRevealed = false;
  linkCopied = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadOfferDetails(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  loadOfferDetails(id: number): void {
    this.loading.set(true);
    this.offerService.getOfferById(id).subscribe({
      next: (data) => {
        if (!data) {
          this.loading.set(false);
          this.cd.detectChanges();
          return;
        }

        this.offer.set(data);
        this.checkIfSaved(data.id);

        // Build gallery images list
        const imgList: string[] = [];
        if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          data.imageUrls.forEach((img: any) => {
            const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
            if (url) {
              const resolved = this.getImageUrl(url);
              if (!imgList.includes(resolved)) imgList.push(resolved);
            }
          });
        }
        if (data.imageUrl) {
          const resolved = this.getImageUrl(data.imageUrl);
          if (!imgList.includes(resolved)) imgList.unshift(resolved);
        }
        if (data.productImageUrl) {
          const resolved = this.getImageUrl(data.productImageUrl);
          if (!imgList.includes(resolved)) imgList.push(resolved);
        }

        if (imgList.length === 0) {
          imgList.push(this.getImageUrl(null));
        }

        this.images.set(imgList);
        this.activeImage.set(imgList[0]);

        // Load store branches and details if storeId exists
        const storeId = data.storeId || data.store_id;
        if (storeId) {
          this.storeService.getBranches(storeId).subscribe({
            next: (b) => {
              this.branches.set(b || []);
              this.cd.detectChanges();
            },
            error: () => {}
          });

          // Fetch Store details for logo & name fallback
          this.storeService.getStoreById(storeId).subscribe({
            next: (st) => {
              if (st) {
                this.offer.update(curr => curr ? {
                  ...curr,
                  storeLogoUrl: curr.storeLogoUrl || st.logoUrl || st.logo_url,
                  storeVerified: curr.storeVerified !== undefined ? curr.storeVerified : st.verified,
                  store: curr.store || st
                } : curr);
                this.cd.detectChanges();
              }
            },
            error: () => {}
          });
        }

        // Load product details & images if productId exists
        const productId = data.productId || data.product_id;
        if (productId) {
          this.productService.getProductById(productId).subscribe({
            next: (prod) => {
              if (prod) {
                this.product.set(prod);

                const prodImages: string[] = [];
                if (prod.primaryImageUrl) {
                  const resolved = this.getImageUrl(prod.primaryImageUrl);
                  if (!this.images().includes(resolved) && !prodImages.includes(resolved)) {
                    prodImages.push(resolved);
                  }
                }
                if (prod.images && Array.isArray(prod.images)) {
                  prod.images.forEach((imgObj: any) => {
                    const raw = typeof imgObj === 'string' ? imgObj : (imgObj.imageUrl || imgObj.image_url);
                    if (raw) {
                      const resolved = this.getImageUrl(raw);
                      if (!this.images().includes(resolved) && !prodImages.includes(resolved)) {
                        prodImages.push(resolved);
                      }
                    }
                  });
                }

                if (prodImages.length > 0) {
                  this.images.update(existing => {
                    // Remove default unsplash placeholder if real product images are found
                    const filtered = existing.filter(img => !img.includes('images.unsplash.com'));
                    const merged = [...filtered, ...prodImages];
                    return merged.length > 0 ? merged : existing;
                  });

                  if (!this.activeImage() || this.activeImage().includes('images.unsplash.com')) {
                    if (this.images().length > 0) {
                      this.activeImage.set(this.images()[0]);
                    }
                  }
                }

                if (prod.details && Array.isArray(prod.details) && prod.details.length > 0) {
                  this.productSpecs.set(prod.details);
                }
                this.cd.detectChanges();
              }
            },
            error: (err) => console.error('Failed to load product info:', err)
          });

          this.productService.getProductSpecs(productId).subscribe({
            next: (specs) => {
              if (specs && Array.isArray(specs) && specs.length > 0) {
                this.productSpecs.set(specs);
                this.cd.detectChanges();
              }
            },
            error: () => {}
          });
        }

        // Load matched coupon
        this.couponService.getAllCoupons().subscribe({
          next: (coupons) => {
            if (coupons && coupons.length > 0) {
              const matched = coupons.find(c => 
                (c.offerId === data.id || c.offer_id === data.id) ||
                (storeId && (c.storeId === storeId || c.store_id === storeId) && c.active !== false)
              );
              this.coupon.set(matched || null);
            }
            this.cd.detectChanges();
          },
          error: () => {}
        });

        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load offer details:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  // Image & Logo Helpers
  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';
    }

    url = url.trim();

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    while (url.startsWith('/')) {
      url = url.substring(1);
    }

    let base = this.filePath || environment.filePath;
    if (!base.endsWith('/')) {
      base += '/';
    }

    if (!url.startsWith('uploads/')) {
      url = 'uploads/' + url;
    }

    return base + url;
  }

  getStoreLogoUrl(itemOrUrl: any): string {
    let url: string | null = null;

    if (typeof itemOrUrl === 'string') {
      url = itemOrUrl;
    } else if (itemOrUrl && typeof itemOrUrl === 'object') {
      url = itemOrUrl.storeLogoUrl || itemOrUrl.store_logo_url || itemOrUrl.store?.logoUrl || itemOrUrl.store?.logo_url || itemOrUrl.logoUrl || itemOrUrl.logo_url;
    }

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='48' height='48'%3E%3Crect width='48' height='48' rx='10' fill='%23eff6ff'/%3E%3Cpath fill='%232563eb' d='M8 14l3-7h26l3 7v3h-2v23a2 2 0 01-2 2H12a2 2 0 01-2-2V17H8v-3zm6 0h20l-1.7-4H15.7L14 14zm18 6H16v18h16V20z'/%3E%3C/svg%3E";
    }

    url = url.trim();

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }

    while (url.startsWith('/')) {
      url = url.substring(1);
    }

    let base = this.filePath || environment.filePath;
    if (!base.endsWith('/')) {
      base += '/';
    }

    if (!url.startsWith('uploads/')) {
      url = 'uploads/' + url;
    }

    return base + url;
  }

  // Saved / Bookmark State
  private checkIfSaved(id: number): void {
    try {
      const stored = localStorage.getItem('dealspot_saved_offers');
      if (stored) {
        const list: number[] = JSON.parse(stored);
        this.isSaved.set(list.includes(id));
      }
    } catch {
      this.isSaved.set(false);
    }
  }

  toggleSave(): void {
    const current = this.offer();
    if (!current) return;

    try {
      const stored = localStorage.getItem('dealspot_saved_offers');
      let list: number[] = stored ? JSON.parse(stored) : [];
      const index = list.indexOf(current.id);

      if (index >= 0) {
        list.splice(index, 1);
        this.isSaved.set(false);
      } else {
        list.push(current.id);
        this.isSaved.set(true);
      }

      localStorage.setItem('dealspot_saved_offers', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update bookmarks in localStorage', e);
    }
  }

  revealCoupon(): void {
    this.couponRevealed = true;
  }

  copyCouponCode(code: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.couponCopied = true;
        setTimeout(() => {
          this.couponCopied = false;
          this.cd.detectChanges();
        }, 2000);
      });
    }
  }

  shareOffer(): void {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.linkCopied = true;
        setTimeout(() => {
          this.linkCopied = false;
          this.cd.detectChanges();
        }, 2000);
      });
    }
  }

  getSavingsAmount(): string {
    const o = this.offer();
    if (!o) return '0.00';
    const orig = Number(o.originalPrice || o.original_price || 0);
    const offer = Number(o.offerPrice || o.offer_price || 0);
    if (orig > offer) {
      return (orig - offer).toFixed(2);
    }
    return '0.00';
  }
}
