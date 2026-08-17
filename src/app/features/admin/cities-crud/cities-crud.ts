import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CityService } from '../../../core/services/city.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
// import { AdminService } from '../../../core/services/admin.service';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { City } from '../../../core/models';

@Component({
  selector: 'app-cities-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: 'cities-crud.html',
  styleUrls: ['./cities-crud.css']
})
export class CitiesCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cityService = inject(CityService);
  // private adminService = inject(AdminService);

  cities = signal<any[]>([]);
  cityForm!: FormGroup;
  isModalOpen = false;
  editingCityId: number | null = null;

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
      next: (res: any) => {
        console.log(res);
        this.cities.set(res);
      },
      error: (err) => {
        console.error(err);
      }
    })
  }

  openAddModal(): void {
    this.editingCityId = null;
    this.cityForm.reset({ is_active: true, latitude: 24.0, longitude: 46.0 });
    this.isModalOpen = true;
  }

  openEditModal(city: any): void {
    this.editingCityId = city.id;
    this.cityForm.patchValue({
      name_en: city.name_en,
      name_ar: city.name_ar,
      region_code: city.region_code,
      latitude: city.latitude,
      longitude: city.longitude,
      is_active: city.is_active === 1
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.cityForm.invalid) return;

    const val = this.cityForm.value;
    const payload = {
      name_en: val.name_en,
      name_ar: val.name_ar,
      region_code: val.region_code,
      latitude: Number(val.latitude),
      longitude: Number(val.longitude),
      is_active: val.is_active ? 1 : 0
    };

    // if (this.editingCityId) {
    //   this.cityService.updateCity(this.editingCityId, payload).subscribe(res => {
    //     this.adminService.logAction('city', res.id, 'UPDATE', 1, payload);
    //     this.loadCities();
    //     this.closeModal();
    //   });
    // } else {
    //   this.cityService.createCity(payload).subscribe(res => {
    //     this.adminService.logAction('city', res.id, 'CREATE', 1, payload);
    //     this.loadCities();
    //     this.closeModal();
    //   });
    // }
  }

  deleteCity(id: number): void {
    if (confirm('Are you sure you want to delete this city?')) {
      this.cityService.deleteCity(id).subscribe(() => {
        // this.adminService.logAction('city', id, 'DELETE', 1);
        this.loadCities();
      });
    }
  }
}
export { TranslationService } from '../../../core/services/translation.service';
