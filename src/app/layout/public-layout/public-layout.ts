import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../shared/pipes/translate-pipe';
import { TranslationService } from '../../core/services/translation.service';


@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    TranslatePipe
  ],
  templateUrl: './public-layout.html',
  styleUrls: ['./public-layout.css']
})
export class PublicLayoutComponent {

  router = inject(Router);

  translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  searchQuery = '';

  isProfileOpen = false;
  isCityModalOpen = false;

  unreadNotificationsCount = signal(3);

  isLoggedIn = signal(true);

  currentUser = signal({
    full_name: 'Arjun',
    email: 'arjun@gmail.com'
  });

  cities = signal([
    {
      id: 1,
      nameEn: 'Riyadh',
      nameAr: 'الرياض'
    },
    {
      id: 2,
      nameEn: 'Jeddah',
      nameAr: 'جدة'
    },
    {
      id: 3,
      nameEn: 'Dammam',
      nameAr: 'الدمام'
    },
    {
      id: 4,
      nameEn: 'Mecca',
      nameAr: 'مكة'
    }
  ]);

  activeCity = signal({
    id: 1,
    nameEn: 'Riyadh',
    nameAr: 'الرياض'
  });

  toggleProfileDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeDropdowns() {
    this.isProfileOpen = false;
  }

  selectCity(city: any) {

    this.activeCity.set(city);

    this.isCityModalOpen = false;

  }

  onSearchSubmit() {

    if (!this.searchQuery.trim()) return;

    alert(this.searchQuery);

  }

  toggleLanguage() {

    this.translationService.toggleLanguage();

  }

  logout() {

    this.isLoggedIn.set(false);

    this.closeDropdowns();

  }

}