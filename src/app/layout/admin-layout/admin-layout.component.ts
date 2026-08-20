import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { APP_CONFIG } from '../../core/config/app-config';

interface AdminMenuItem {
  label_en: string;
  label_ar: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  router = inject(Router);

  currentLang = this.translationService.currentLang;
  appConfig = APP_CONFIG;
  adminUser = this.authService.currentUser;

  allMenuItems: AdminMenuItem[] = [
    { label_en: 'Dashboard', label_ar: 'الرئيسية', icon: 'dashboard', route: '/admin' },
    { label_en: 'Partner Requests', label_ar: 'طلبات الشراكة', icon: 'handshake', route: '/admin/partner-requests' },
    { label_en: 'Cities', label_ar: 'المدن', icon: 'place', route: '/admin/cities' },
    { label_en: 'Categories', label_ar: 'الأقسام', icon: 'category', route: '/admin/categories' },
    { label_en: 'Brands', label_ar: 'الماركات', icon: 'loyalty', route: '/admin/brands' },
    { label_en: 'Stores', label_ar: 'المتاجر', icon: 'store', route: '/admin/stores' },
    { label_en: 'Products', label_ar: 'المنتجات', icon: 'shopping_bag', route: '/admin/products' },
    { label_en: 'Offers', label_ar: 'العروض', icon: 'local_offer', route: '/admin/offers' },
    { label_en: 'Flyers', label_ar: 'المنشورات', icon: 'menu_book', route: '/admin/flyers' },
    { label_en: 'Coupons', label_ar: 'الكوبونات', icon: 'confirmation_number', route: '/admin/coupons' },
    { label_en: 'Staff & Admins', label_ar: 'المشرفين', icon: 'people', route: '/admin/users' },
    { label_en: 'Notifications', label_ar: 'الإشعارات', icon: 'notifications', route: '/admin/notifications' },
    { label_en: 'Audit Logs', label_ar: 'سجل العمليات', icon: 'history_edu', route: '/admin/audit-logs' }
  ];

  get menuItems(): AdminMenuItem[] {
    const user = this.adminUser();
    const role = (user?.role || '').toUpperCase();

    if (role === 'STORE_MANAGER') {
      const storeId = user?.storeId;
      return [
        { label_en: 'Store Dashboard', label_ar: 'لوحة المتجر', icon: 'dashboard', route: '/admin' },
        { label_en: 'My Branches', label_ar: 'فروع متجري', icon: 'store', route: storeId ? `/admin/stores/${storeId}/branches` : '/admin/stores' },
        { label_en: 'My Products', label_ar: 'منتجات المتجر', icon: 'shopping_bag', route: '/admin/products' },
        { label_en: 'My Offers & Deals', label_ar: 'عروض متجري', icon: 'local_offer', route: '/admin/offers' },
        { label_en: 'My Flyers', label_ar: 'منشورات متجري', icon: 'menu_book', route: '/admin/flyers' },
        { label_en: 'My Coupons', label_ar: 'كوبونات الخصم', icon: 'confirmation_number', route: '/admin/coupons' }
      ];
    }

    return this.allMenuItems;
  }

  toggleLanguage(): void {
    this.translationService.toggleLanguage();
  }

  logout(): void {
    this.authService.logout('/login?admin=true');
  }
}


