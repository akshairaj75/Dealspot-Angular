export interface AppConfig {
  // Brand & Identity
  appNameEn: string;
  appNameAr: string;
  appSubtitleEn: string;
  appSubtitleAr: string;
  logoUrl?: string | null;
  logoIcon: string;
  adminAppNameEn: string;
  adminAppNameAr: string;
  adminLogoIcon: string;

  // Slogans & Taglines
  taglineEn: string;
  taglineAr: string;
  copyrightEn: string;
  copyrightAr: string;

  // Hero Banner & Homepage
  heroTitleEn: string;
  heroTitleAr: string;
  heroDescriptionEn: string;
  heroDescriptionAr: string;
  heroBannerBgImage?: string | null;

  // Contacts & Support
  supportEmail: string;
  adminDefaultEmail: string;
}

export const APP_CONFIG: AppConfig = {
  // Brand & Identity
  appNameEn: 'DealSpot',
  appNameAr: 'ديل سبوت',
  appSubtitleEn: 'Saudi Arabia',
  appSubtitleAr: 'المملكة العربية السعودية',
  logoUrl: null, // Set custom image URL (e.g. '/assets/logo.png') or null to use Material logoIcon
  logoIcon: 'local_offer',
  adminAppNameEn: 'DealSpot Admin',
  adminAppNameAr: 'إدارة ديل سبوت',
  adminLogoIcon: 'admin_panel_settings',

  // Slogans & Taglines
  taglineEn: 'Your premium Saudi discount and flyer platform. Save smart, live well.',
  taglineAr: 'منصتك المميزة للعروض والمنشورات الترويجية في المملكة. تسوق بذكاء ووفر أكثر.',
  copyrightEn: '© 2026 DealSpot KSA. All rights reserved.',
  copyrightAr: '© 2026 ديل سبوت السعودية. جميع الحقوق محفوظة.',

  // Hero Banner & Homepage
  heroTitleEn: 'Discover the Best Deals & Flyers in',
  heroTitleAr: 'اكتشف أفضل العروض والمنشورات في',
  heroDescriptionEn: 'Browse active discounts, store brochures, and coupon codes from hypermarkets, bookstores, restaurants, and electronics centers.',
  heroDescriptionAr: 'تصفح أحدث التخفيضات والعروض الترويجية والكتالوجات الأسبوعية وأكواد الخصم من كبرى المتاجر والمراكز التجارية.',
  heroBannerBgImage: '/dealspot/hero_banner.png', // Hero banner image located in public/dealspot/

  // Contacts & Support
  supportEmail: 'support@dealspot.sa',
  adminDefaultEmail: 'admin@dealspot.com'
};