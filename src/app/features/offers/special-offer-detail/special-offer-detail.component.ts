import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SpecialOfferService, SpecialOfferItem } from '../../../core/services/special-offer.service';
import { OfferService } from '../../../core/services/offer.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-special-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './special-offer-detail.component.html',
  styleUrl: './special-offer-detail.component.css'
})
export class SpecialOfferDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private specialOfferService = inject(SpecialOfferService);
  private offerService = inject(OfferService);
  authService = inject(AuthService);
  translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  campaign = signal<SpecialOfferItem | null>(null);
  loading = signal<boolean>(true);
  searchQuery = '';

  // Saved offers state
  savedOfferIds = signal<Set<number>>(new Set());

  // Countdown timer
  countdownDays = 0;
  countdownHours = 0;
  countdownMinutes = 0;
  countdownSeconds = 0;
  private timerInterval?: any;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadCampaign(id);
      }
    });

    if (this.authService.isAuthenticated()) {
      this.loadSavedOffers();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadCampaign(id: string | number): void {
    this.loading.set(true);
    this.specialOfferService.getSpecialOfferById(id).subscribe({
      next: (res) => {
        this.campaign.set(res);
        this.loading.set(false);
        this.initCountdown(res.validUntil);
      },
      error: () => {
        this.loading.set(false);
        this.campaign.set(null);
      }
    });
  }

  loadSavedOffers(): void {
    this.offerService.getMySavedOffers().subscribe({
      next: (offers: any[]) => {
        const set = new Set<number>();
        if (offers) {
          offers.forEach(o => set.add(o.id));
        }
        this.savedOfferIds.set(set);
      },
      error: () => { }
    });
  }

  initCountdown(validUntilStr: string): void {
    if (!validUntilStr) return;
    const targetDate = new Date(validUntilStr + 'T23:59:59').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        this.countdownDays = 0;
        this.countdownHours = 0;
        this.countdownMinutes = 0;
        this.countdownSeconds = 0;
        if (this.timerInterval) clearInterval(this.timerInterval);
        return;
      }

      this.countdownDays = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.countdownHours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.countdownMinutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.countdownSeconds = Math.floor((distance % (1000 * 60)) / 1000);
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  toggleSave(offer: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.isAuthenticated()) {
      Swal.fire({
        icon: 'info',
        title: this.currentLang() === 'en' ? 'Login Required' : 'تسجيل الدخول مطلوب',
        text: this.currentLang() === 'en' ? 'Please log in to save deals to your wishlist.' : 'يرجى تسجيل الدخول لحفظ العروض في قائمتك المفضلة.',
        confirmButtonText: this.currentLang() === 'en' ? 'Login' : 'دخول'
      }).then((r) => {
        if (r.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    this.offerService.toggleSaveOffer(offer.id).subscribe({
      next: (res) => {
        const set = new Set(this.savedOfferIds());
        if (res.isSaved) {
          set.add(offer.id);
        } else {
          set.delete(offer.id);
        }
        this.savedOfferIds.set(set);
      }
    });
  }

  isOfferSaved(offerId: number): boolean {
    return this.savedOfferIds().has(offerId);
  }

  shareCampaign(): void {
    if (navigator.share) {
      navigator.share({
        title: this.currentLang() === 'en' ? this.campaign()?.titleEn : this.campaign()?.titleAr,
        text: this.currentLang() === 'en' ? 'Check out this mega special offer on DealSpot!' : 'شاهد هذا العرض الخاص الاستثنائي على ديل سبوت!',
        url: window.location.href
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      Swal.fire({
        icon: 'success',
        title: this.currentLang() === 'en' ? 'Link Copied' : 'تم نسخ الرابط',
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '';
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

  getBannerUrl(url: string | undefined): string {
    const resolved = this.getImageUrl(url);
    return resolved || 'assets/images/placeholder-banner.png';
  }

  getStoreLogoUrl(item: any): string {
    const raw = item.storeLogoUrl || item.store_logo_url || (item.store ? (item.store.logoUrl || item.store.logo_url) : null);
    const resolved = this.getImageUrl(raw);
    return resolved || 'assets/images/store-placeholder.png';
  }

  getOfferImageUrl(offer: any): string {
    const raw = offer.imageUrl || offer.image_url || offer.productPrimaryImageUrl || offer.thumbnailUrl;
    const resolved = this.getImageUrl(raw);
    return resolved || 'assets/images/placeholder.png';
  }

  filteredOffers(): any[] {
    const today = new Date().toISOString().split('T')[0];
    const raw = (this.campaign()?.offers || []).filter(o => {
      const isActive = o.active !== false && o.is_active !== 0 && o.isActive !== false;
      const isNotExpired = !o.isExpired && o.status !== 'EXPIRED' && !(o.validUntil && o.validUntil < today) && !(o.valid_until && o.valid_until < today);
      return isActive && isNotExpired;
    });

    // Deduplicate by productId keeping latest
    const map = new Map<any, any>();
    for (const o of raw) {
      const pId = o.productId || o.product_id || (o.product ? o.product.id : o.id);
      map.set(pId, o);
    }
    const list = Array.from(map.values());

    if (!this.searchQuery || this.searchQuery.trim() === '') {
      return list;
    }
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(o =>
      (o.titleEn && o.titleEn.toLowerCase().includes(q)) ||
      (o.titleAr && o.titleAr.toLowerCase().includes(q)) ||
      (o.productNameEn && o.productNameEn.toLowerCase().includes(q)) ||
      (o.productNameAr && o.productNameAr.toLowerCase().includes(q))
    );
  }
}
