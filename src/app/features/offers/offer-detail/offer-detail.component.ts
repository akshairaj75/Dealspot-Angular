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
import { APP_CONFIG } from '../../../core/config/app-config';

import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

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
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);


  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;
  appConfig = APP_CONFIG;

  offer = signal<any | null>(null);
  product = signal<any | null>(null);
  coupon = signal<any | null>(null);
  productSpecs = signal<any[]>([]);
  branches = signal<any[]>([]);
  images = signal<string[]>([]);
  activeImage = signal<string>('');
  lightboxImage = signal<string | null>(null);
  activeTab = signal<'overview' | 'specs' | 'store' | 'terms'>('overview');

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

        // 1. Build initial offer images (offer image as 1st slide if present)
        const imgList: string[] = [];
        const offerMainImage = data.imageUrl || data.image_url;
        
        if (offerMainImage) {
          imgList.push(this.getImageUrl(offerMainImage));
        }

        if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
          data.imageUrls.forEach((img: any) => {
            const url = typeof img === 'string' ? img : (img.imageUrl || img.image_url);
            if (url) {
              const resolved = this.getImageUrl(url);
              if (!imgList.includes(resolved)) imgList.push(resolved);
            }
          });
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
            error: () => { }
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
            error: () => { }
          });
        }

        // 2. Load linked product details & images (preserves product attributes & details)
        const productId = data.productId || data.product_id;
        if (productId) {
          this.productService.getProductById(productId).subscribe({
            next: (prod) => {
              if (prod) {
                // Keep complete product details, brand, and specifications intact
                this.product.set(prod);

                const prodImages: string[] = [];
                if (prod.primaryImageUrl) {
                  const resolved = this.getImageUrl(prod.primaryImageUrl);
                  if (!prodImages.includes(resolved)) {
                    prodImages.push(resolved);
                  }
                }
                if (prod.images && Array.isArray(prod.images)) {
                  prod.images.forEach((imgObj: any) => {
                    const raw = typeof imgObj === 'string' ? imgObj : (imgObj.imageUrl || imgObj.image_url);
                    if (raw) {
                      const resolved = this.getImageUrl(raw);
                      if (!prodImages.includes(resolved)) {
                        prodImages.push(resolved);
                      }
                    }
                  });
                }

                if (prodImages.length > 0) {
                  this.images.update(existing => {
                    // Remove placeholder when real product images are found
                    const cleanExisting = existing.filter(img => !img.startsWith('data:image/svg') && !img.includes('unsplash.com'));
                    
                    if (cleanExisting.length > 0) {
                      // Offer image is present: Offer image remains 1st slide, append product images as other slides
                      const merged = [...cleanExisting];
                      prodImages.forEach(pImg => {
                        if (!merged.includes(pImg)) merged.push(pImg);
                      });
                      return merged;
                    } else {
                      // No offer image provided: Product primary image is 1st slide + product gallery
                      return prodImages;
                    }
                  });

                  if (!this.activeImage() || this.activeImage().startsWith('data:image/svg') || this.activeImage().includes('unsplash.com')) {
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
        } else if (!offerMainImage) {
          // No offer image and no product id -> show placeholder
          const fallback = this.getImageUrl(null);
          this.images.set([fallback]);
          this.activeImage.set(fallback);
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
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Cpath fill='%23cbd5e1' d='M160 110a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm100 120H140l50-65 35 45 25-30 40 50z'/%3E%3Ctext x='50%25' y='82%25' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='500'%3EDealSpot%3C/text%3E%3C/svg%3E";
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
  checkIfSaved(offerId: number): void {
    if (this.authService.isAuthenticated()) {
      this.offerService.isOfferSaved(offerId).subscribe({
        next: (res) => {
          this.isSaved.set(!!res?.isSaved);
          this.cd.detectChanges();
        },
        error: () => {}
      });
    } else {
      this.isSaved.set(false);
    }
  }

  toggleSaveOffer(): void {
    const o = this.offer();
    if (!o) return;

    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        title: this.currentLang() === 'en' ? 'Sign in Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en'
          ? 'Please sign in to save this offer to your favorites.'
          : 'يرجى تسجيل الدخول لحفظ هذا العرض في المفضلة.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: this.currentLang() === 'en' ? 'Sign In' : 'تسجيل الدخول',
        cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    const wasSaved = this.isSaved();
    this.isSaved.set(!wasSaved);

    this.offerService.toggleSaveOffer(o.id).subscribe({
      next: (res) => {
        this.isSaved.set(res.isSaved);
        if (res.saveCount !== undefined) {
          this.offer.update(curr => curr ? { ...curr, saveCount: res.saveCount } : curr);
        }
        this.cd.detectChanges();
      },
      error: () => {
        this.isSaved.set(wasSaved);
        this.cd.detectChanges();
      }
    });
  }

  toggleSave(): void {
    this.toggleSaveOffer();
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

  nextImage(): void {
    const list = this.images();
    if (list.length <= 1) return;
    const currIdx = list.indexOf(this.activeImage());
    const nextIdx = (currIdx + 1) % list.length;
    this.activeImage.set(list[nextIdx]);
  }

  prevImage(): void {
    const list = this.images();
    if (list.length <= 1) return;
    const currIdx = list.indexOf(this.activeImage());
    const prevIdx = (currIdx - 1 + list.length) % list.length;
    this.activeImage.set(list[prevIdx]);
  }

  openLightbox(img: string): void {
    this.lightboxImage.set(img);
  }

  closeLightbox(): void {
    this.lightboxImage.set(null);
  }

  switchTab(tab: 'overview' | 'specs' | 'store' | 'terms'): void {
    this.activeTab.set(tab);
  }

  getDaysRemaining(): { text: string; urgent: boolean } | null {
    const o = this.offer();
    if (!o || (!o.validUntil && !o.valid_until)) return null;
    const validUntilStr = o.validUntil || o.valid_until;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(validUntilStr);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { text: this.currentLang() === 'en' ? 'Expired' : 'منتهي الصلاحية', urgent: true };
      } else if (diffDays === 0) {
        return { text: this.currentLang() === 'en' ? 'Ends Today!' : 'ينتهي اليوم!', urgent: true };
      } else if (diffDays === 1) {
        return { text: this.currentLang() === 'en' ? 'Ends Tomorrow!' : 'ينتهي غداً!', urgent: true };
      } else if (diffDays <= 5) {
        return { text: this.currentLang() === 'en' ? `${diffDays} days left` : `متبقي ${diffDays} أيام`, urgent: true };
      } else {
        return { text: this.currentLang() === 'en' ? `${diffDays} days remaining` : `متبقي ${diffDays} يوماً`, urgent: false };
      }
    } catch {
      return null;
    }
  }
}
