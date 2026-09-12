import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuditLogService, RecentActivityDto } from '../../../core/services/audit-log.service';
import { StoreService } from '../../../core/services/store.service';
import { OfferService } from '../../../core/services/offer.service';
import { FlyerService } from '../../../core/services/flyer.service';
import { CouponService } from '../../../core/services/coupon.service';
import { PartnerRequestService } from '../../../core/services/partner-request.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private translationService = inject(TranslationService);
  public authService = inject(AuthService);
  private auditLogService = inject(AuditLogService);
  private storeService = inject(StoreService);
  private offerService = inject(OfferService);
  private flyerService = inject(FlyerService);
  private couponService = inject(CouponService);
  private partnerRequestService = inject(PartnerRequestService);

  currentLang = this.translationService.currentLang;
  currentUser = this.authService.currentUser;
  isStoreManager = this.authService.isStoreManager;
  isSuperAdmin = this.authService.isSuperAdmin;
  filePath = environment.filePath;

  loadingStats = signal<boolean>(true);
  storeInfo = signal<any | null>(null);

  // Store Manager Metrics
  storeOffersCount = signal<number>(0);
  storeFlyersCount = signal<number>(0);
  storeBranchesCount = signal<number>(0);
  storeFollowersCount = signal<number>(0);
  storeCouponsCount = signal<number>(0);

  // Super Admin Platform Metrics
  totalStoresCount = signal<number>(0);
  totalOffersCount = signal<number>(0);
  totalFlyersCount = signal<number>(0);
  pendingPartnerRequestsCount = signal<number>(0);
  totalCouponsCount = signal<number>(0);

  recentActivities = signal<RecentActivityDto[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadingStats.set(true);

    if (this.isStoreManager()) {
      this.loadStoreManagerData();
    } else {
      this.loadSuperAdminData();
    }
  }

  private loadStoreManagerData(): void {
    const user = this.currentUser();
    const storeId = user?.storeId ? Number(user.storeId) : null;

    if (storeId) {
      // 1. Fetch Store Profile
      this.storeService.getStoreById(storeId).subscribe({
        next: (store) => this.storeInfo.set(store),
        error: (err) => console.error('Failed to load store profile for dashboard:', err)
      });

      // 2. Fetch Branches count
      this.storeService.getBranches(storeId).subscribe({
        next: (branches) => this.storeBranchesCount.set(branches?.length || 0),
        error: () => {}
      });

      // 3. Fetch Offers count
      this.offerService.getAllOffers(storeId, true).subscribe({
        next: (offers) => this.storeOffersCount.set(offers?.length || 0),
        error: () => {}
      });

      // 4. Fetch Flyers count
      this.flyerService.getAllFlyers(undefined, undefined, undefined, undefined, undefined).subscribe({
        next: (flyers) => {
          const storeFlyers = (flyers || []).filter((f: any) => Number(f.storeId || f.store_id || f.store?.id) === storeId);
          this.storeFlyersCount.set(storeFlyers.length);
        },
        error: () => {}
      });

      // 5. Fetch Followers count
      this.storeService.getFollowersCount(storeId).subscribe({
        next: (res) => this.storeFollowersCount.set(res?.followersCount || 0),
        error: () => {}
      });

      // 6. Fetch Coupons count
      this.couponService.getAllCoupons().subscribe({
        next: (coupons) => {
          const myCoupons = (coupons || []).filter((c: any) => Number(c.storeId || c.store_id) === storeId);
          this.storeCouponsCount.set(myCoupons.length);
          this.loadingStats.set(false);
        },
        error: () => this.loadingStats.set(false)
      });
    } else {
      this.loadingStats.set(false);
    }
  }

  private loadSuperAdminData(): void {
    // 1. Total Stores
    this.storeService.getStores().subscribe({
      next: (stores) => this.totalStoresCount.set(stores?.length || 0),
      error: () => {}
    });

    // 2. Total Offers
    this.offerService.getAllOffers(undefined, true).subscribe({
      next: (offers) => this.totalOffersCount.set(offers?.length || 0),
      error: () => {}
    });

    // 3. Total Flyers
    this.flyerService.getAllFlyers().subscribe({
      next: (flyers) => this.totalFlyersCount.set(flyers?.length || 0),
      error: () => {}
    });

    // 4. Pending Partner Requests
    this.partnerRequestService.getAllRequests('PENDING').subscribe({
      next: (reqs) => this.pendingPartnerRequestsCount.set(reqs?.length || 0),
      error: () => {}
    });

    // 5. Total Coupons
    this.couponService.getAllCoupons().subscribe({
      next: (coupons) => this.totalCouponsCount.set(coupons?.length || 0),
      error: () => {}
    });

    // 6. Recent Audit Activities
    this.auditLogService.getRecentActivities().subscribe({
      next: (activities) => {
        this.recentActivities.set(activities || []);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false)
    });
  }

  get userRoleLabel(): string {
    const role = (this.currentUser()?.role || '').toUpperCase();
    if (this.currentLang() === 'ar') {
      if (role === 'SUPER_ADMIN') return 'المدير العام (Super Admin)';
      if (role === 'STORE_MANAGER') return 'مدير المتجر (Store Manager)';
      if (role === 'CONTENT_MANAGER') return 'مدير المحتوى (Content Manager)';
      return 'المشرف';
    } else {
      if (role === 'SUPER_ADMIN') return 'Super Administrator';
      if (role === 'STORE_MANAGER') return 'Store Manager';
      if (role === 'CONTENT_MANAGER') return 'Content Manager';
      return 'Administrator';
    }
  }

  getStoreLogoUrl(store: any): string {
    if (!store) return 'assets/images/placeholder-store.png';
    const url = store.logoUrl || store.logo_url || store.logo;
    if (!url) return 'assets/images/placeholder-store.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }
}


