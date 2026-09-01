import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CityService } from '../../../core/services/city.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import { MapUtils } from '../../../core/utils/map-utils';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cities-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LocationPickerComponent],
  templateUrl: 'cities-crud.html',
  styleUrls: ['./cities-crud.css']
})
export class CitiesCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cityService = inject(CityService);
  private translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;
  cities = signal<any[]>([]);
  cityForm!: FormGroup;
  isModalOpen = false;
  editingCityId: number | null = null;

  viewMode = signal<'GRID' | 'TABLE'>('GRID');
  searchQuery = '';
  openMenuId = signal<number | null>(null);
  copiedCityId = signal<number | null>(null);

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openMenuId() !== null) {
      this.openMenuId.set(null);
    }
  }

  toggleCityMenu(id: number, event: Event): void {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(id);
    }
  }

  closeCityMenu(): void {
    this.openMenuId.set(null);
  }

  copyCoords(lat: number, lng: number, id: number, event?: Event): void {
    if (event) event.stopPropagation();
    const text = `${lat}, ${lng}`;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedCityId.set(id);
      setTimeout(() => this.copiedCityId.set(null), 2000);
    });
  }

  getCityMapUrl(c: any): string {
    return MapUtils.getGoogleMapsUrl({
      latitude: c.latitude,
      longitude: c.longitude,
      cityNameEn: c.nameEn || c.name_en,
      cityNameAr: c.nameAr || c.name_ar,
      lang: this.currentLang()
    });
  }

  openInMap(c: any, event?: Event): void {
    MapUtils.openInGoogleMaps({
      latitude: c.latitude,
      longitude: c.longitude,
      cityNameEn: c.nameEn || c.name_en,
      cityNameAr: c.nameAr || c.name_ar,
      lang: this.currentLang()
    }, event);
  }

  setViewMode(mode: 'GRID' | 'TABLE'): void {
    this.viewMode.set(mode);
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  getFilteredCities(): any[] {
    let list = this.cities();
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const nameEn = (c.nameEn || c.name_en || '').toLowerCase();
        const nameAr = (c.nameAr || c.name_ar || '').toLowerCase();
        const region = (c.regionCode || c.region_code || '').toLowerCase();
        return nameEn.includes(q) || nameAr.includes(q) || region.includes(q);
      });
    }
    return list;
  }

  ngOnInit(): void {
    this.loadCities();
    this.cityForm = this.fb.group({
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      region_code: ['', Validators.required],
      latitude: [24.0, Validators.required],
      longitude: [46.0, Validators.required],
      is_active: [true]
    });
  }

  loadCities(): void {
    this.cityService.getCities().subscribe({
      next: (res: any[]) => {
        this.cities.set(res || []);
      },
      error: (err) => {
        console.error('Error loading cities:', err);
      }
    });
  }

  openAddModal(): void {
    this.editingCityId = null;
    this.cityForm.reset({
      name_en: '',
      name_ar: '',
      region_code: '',
      latitude: 24.0,
      longitude: 46.0,
      is_active: true
    });
    this.isModalOpen = true;
  }

  openEditModal(city: any): void {
    this.editingCityId = city.id;
    this.cityForm.patchValue({
      name_en: city.nameEn ?? city.name_en ?? '',
      name_ar: city.nameAr ?? city.name_ar ?? '',
      region_code: city.regionCode ?? city.region_code ?? '',
      latitude: city.latitude ?? 24.0,
      longitude: city.longitude ?? 46.0,
      is_active: city.active === true || city.active === 1 || city.isActive === true || city.isActive === 1 || city.is_active === 1 || city.is_active === true
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.cityForm.invalid) {
      this.cityForm.markAllAsTouched();
      return;
    }

    const val = this.cityForm.value;
    const payload = {
      nameEn: val.name_en,
      nameAr: val.name_ar,
      regionCode: val.region_code,
      latitude: Number(val.latitude),
      longitude: Number(val.longitude),
      isActive: Boolean(val.is_active)
    };

    if (this.editingCityId) {
      this.cityService.updateCity(this.editingCityId, payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.currentLang() === 'en' ? 'Updated!' : 'تم التحديث!',
            text: this.currentLang() === 'en' ? 'City updated successfully.' : 'تم تحديث المدينة بنجاح.',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadCities();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating city:', err);
          Swal.fire({
            icon: 'error',
            title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
            text: this.currentLang() === 'en' ? 'Failed to update city.' : 'فشل تحديث المدينة.'
          });
        }
      });
    } else {
      this.cityService.createCity(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.currentLang() === 'en' ? 'Added!' : 'تمت الإضافة!',
            text: this.currentLang() === 'en' ? 'City added successfully.' : 'تم إضافة المدينة بنجاح.',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadCities();
          this.closeModal();
        },
        error: (err) => {
          console.error('Error adding city:', err);
          Swal.fire({
            icon: 'error',
            title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
            text: this.currentLang() === 'en' ? 'Failed to add city.' : 'فشل إضافة المدينة.'
          });
        }
      });
    }
  }

  deleteCity(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' ? 'Do you want to delete this city?' : 'هل تريد حذف هذه المدينة؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذفها!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cityService.deleteCity(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'City has been deleted.' : 'تم حذف المدينة.',
              'success'
            );
            this.loadCities();
          },
          error: (err) => {
            console.error('Error deleting city:', err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete city.' : 'فشل حذف المدينة.',
              'error'
            );
          }
        });
      }
    });
  }
}
export { TranslationService } from '../../../core/services/translation.service';

