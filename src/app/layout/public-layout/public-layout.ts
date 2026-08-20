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
import { AuthService } from '../../core/services/auth.service';
import { APP_CONFIG } from '../../core/config/app-config';

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
export class PublicLayoutComponent implements OnInit {

  router = inject(Router);
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  currentLang = this.translationService.currentLang;
  appConfig = APP_CONFIG;

  searchQuery = '';

  isProfileOpen = false;
  isCityModalOpen = false;

  unreadNotificationsCount = signal(3);

  // Authentication State directly from AuthService
  currentUser = this.authService.currentUser;
  isLoggedIn = this.authService.isAuthenticated;
  isAdmin = this.authService.isAdmin;

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
    this.router.navigate(['/offers-list'], { queryParams: { q: this.searchQuery.trim() } });
  }

  toggleLanguage() {
    this.translationService.toggleLanguage();
  }

  logout() {
    this.closeDropdowns();
    this.authService.logout('/');
  }

}