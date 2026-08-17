import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CityService } from '../../core/services/city.service';
import { TranslatePipe } from '../../shared/pipes/translate-pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {

  cityService = inject(CityService);

  categories = signal([
    {
      id: 1,
      nameEn: 'Groceries',
      nameAr: 'البقالة',
      icon_slug: 'shopping_cart'
    },
    {
      id: 2,
      nameEn: 'Electronics',
      nameAr: 'الإلكترونيات',
      icon_slug: 'devices'
    },
    {
      id: 3,
      nameEn: 'Fashion',
      nameAr: 'الأزياء',
      icon_slug: 'checkroom'
    },
    {
      id: 4,
      nameEn: 'Restaurants',
      nameAr: 'المطاعم',
      icon_slug: 'restaurant'
    }
  ]);

  flashDeals = signal([
    {
      id: 1,
      titleEn: 'Samsung Galaxy A55',
      titleAr: 'سامسونج A55',
      discount_pct: 45,
      offer_price: 1049,
      original_price: 1599,
      valid_until: '15 Jul 2026',
      store_id: 1,
      product: {
        primary_image_url: 'https://picsum.photos/300/220?1'
      },
      store: {
        nameEn: 'Extra',
        nameAr: 'إكسترا',
        logo_url: 'https://picsum.photos/40?1',
        is_verified: 1
      }
    },
    {
      id: 2,
      titleEn: 'Apple AirPods Pro',
      titleAr: 'ايربودز برو',
      discount_pct: 30,
      offer_price: 799,
      original_price: 1099,
      valid_until: '18 Jul 2026',
      store_id: 2,
      product: {
        primary_image_url: 'https://picsum.photos/300/220?2'
      },
      store: {
        nameEn: 'Jarir',
        nameAr: 'جرير',
        logo_url: 'https://picsum.photos/40?2',
        is_verified: 1
      }
    }
  ]);

  featuredOffers = signal([
    {
      id: 3,
      titleEn: 'LG Smart TV',
      titleAr: 'تلفزيون إل جي',
      discount_pct: 20,
      offer_price: 1999,
      original_price: 2499,
      valid_until: '22 Jul 2026',
      store_id: 3,
      product: {
        primary_image_url: 'https://picsum.photos/300/220?3'
      },
      store: {
        nameEn: 'Carrefour',
        nameAr: 'كارفور',
        logo_url: 'https://picsum.photos/40?3',
        is_verified: 1
      }
    }
  ]);

  latestOffers = signal([
    {
      id: 4,
      titleEn: 'Nike Running Shoes',
      titleAr: 'حذاء نايكي',
      discount_pct: 40,
      offer_price: 299,
      original_price: 499,
      valid_until: '25 Jul 2026',
      is_flash: 1,
      store_id: 4,
      product: {
        primary_image_url: 'https://picsum.photos/300/220?4'
      },
      store: {
        nameEn: 'Nike',
        nameAr: 'نايكي',
        logo_url: 'https://picsum.photos/40?4',
        is_verified: 1
      }
    },
    {
      id: 5,
      titleEn: 'Fresh Chicken 1kg',
      titleAr: 'دجاج طازج',
      discount_pct: 35,
      offer_price: 22,
      original_price: 35,
      valid_until: '28 Jul 2026',
      is_flash: 0,
      store_id: 5,
      product: {
        primary_image_url: 'https://picsum.photos/300/220?5'
      },
      store: {
        nameEn: 'Panda',
        nameAr: 'باندا',
        logo_url: 'https://picsum.photos/40?5',
        is_verified: 1
      }
    }
  ]);

  activeFlyers = signal([
    {
      id: 1,
      titleEn: 'Weekly Grocery Offers',
      titleAr: 'عروض البقالة الأسبوعية',
      total_pages: 24,
      cover_image_url: 'https://picsum.photos/400/550?6',
      store_id: 1,
      store: {
        nameEn: 'Panda',
        nameAr: 'باندا',
        logo_url: 'https://picsum.photos/40?6'
      }
    },
    {
      id: 2,
      titleEn: 'Electronics Mega Sale',
      titleAr: 'تخفيضات الإلكترونيات',
      total_pages: 18,
      cover_image_url: 'https://picsum.photos/400/550?7',
      store_id: 2,
      store: {
        nameEn: 'Extra',
        nameAr: 'إكسترا',
        logo_url: 'https://picsum.photos/40?7'
      }
    }
  ]);

  toggleSaveOffer(offer: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    alert('Saved: ' + offer.titleEn);
  }

  isSaved(id: number): boolean {
    return false;
  }
}