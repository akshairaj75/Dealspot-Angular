import { Component, inject, signal, OnInit } from '@angular/core';
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
import { CityService } from '../../core/services/city.service';


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

  cityService = inject(CityService);

  activeCity = this.cityService.selectedCity;
  cities = signal<any[]>([]);

  ngOnInit(): void {
    this.cityService.getCities().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.cities.set(res);
          // If activeCity not set or not in list, pick first
          const current = this.cityService.selectedCity();
          if (!current || !res.find((c: any) => c.id === current.id)) {
            this.cityService.setSelectedCity(res[0]);
          }
        }
      },
      error: (err) => console.error('Failed to load cities:', err)
    });
  }

  toggleProfileDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeDropdowns() {
    this.isProfileOpen = false;
  }

  selectCity(city: any) {
    this.cityService.setSelectedCity(city);
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