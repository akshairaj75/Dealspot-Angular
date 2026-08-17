import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
// import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
import { CategoryService } from '../../../core/services/category.service';
// import { AdminService } from '../../../core/services/admin.service';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { Store, City, Category } from '../../../core/models';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { StoreService } from '../../../core/services/store.service';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-stores-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './stores-crud.component.html',
  styleUrls: ['./stores-crud.component.css']
})
export class StoresCrudComponent implements OnInit {

  constructor(private storeService: StoreService) { }
  private fb = inject(FormBuilder);
  // private storeService = inject(StoreService);
  private cityService = inject(CityService);
  private categoryService = inject(CategoryService);
  // private adminService = inject(AdminService);

  stores = signal<any[]>([]);
  cities = signal<any[]>([]);
  categories = signal<any[]>([]);
  
  storeForm!: FormGroup;
  isModalOpen = false;
  editingStoreId: number | null = null;
  filePath = environment.filePath;
 

  ngOnInit(): void {
    this.loadStores();
    // this.cityService.getCities().subscribe(res => this.cities.set(res));
    this.categoryService.getCategories().subscribe(res => this.categories.set(res));

    this.storeForm = this.fb.group({
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      logo_url: ['', Validators.required],
      city_id: ['', Validators.required],
      category_id: ['', Validators.required],
      cr_number: [''],
      vat_number: [''],
      is_verified: [false],
      is_active: [true]
    });
  }

  loadStores(): void {
    this.storeService.getStores().subscribe((res:any)=>{
      this.stores.set(res);
      console.log(res)
    });
  }

  openAddModal(): void {
    this.editingStoreId = null;
    this.storeForm.reset({ is_active: true, is_verified: false });
    this.isModalOpen = true;
  }

 openEditModal(store: any): void {
  this.editingStoreId = store.id;

  this.storeForm.patchValue({
    name_en: store.nameEn,
    name_ar: store.nameAr,
    logo_url: store.logoUrl,
    city_id: store.cityId,
    category_id: store.categoryId,
    cr_number: store.crNumber,
    vat_number: store.vatNumber,
    is_verified: store.verified,
    is_active: store.active
  });

  this.isModalOpen = true;
}

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
  if (this.storeForm.invalid) {
    this.storeForm.markAllAsTouched();
    return;
  }

  const val = this.storeForm.value;

  const payload = {
    nameEn: val.name_en,
    nameAr: val.name_ar,
    logoUrl: val.logo_url,
    cityId: Number(val.city_id),
    categoryId: Number(val.category_id),
    crNumber: val.cr_number,
    vatNumber: val.vat_number,
    verified: val.is_verified,
    active: val.is_active
  };

  if (this.editingStoreId) {

    this.storeService.updateStore(this.editingStoreId, payload).subscribe({
      next: () => {
        this.loadStores();
        this.closeModal();
        this.storeForm.reset({
          is_active: true,
          is_verified: false
        });
      },
      error: (err) => {
        console.error('Update Error:', err);
      }
    });

  } else {

    this.storeService.createStore(payload).subscribe({
      next: () => {
        this.loadStores();
        this.closeModal();
        this.storeForm.reset({
          is_active: true,
          is_verified: false
        });
      },
      error: (err) => {
        console.error('Create Error:', err);
      }
    });

  }
}
  // deleteStore(id: number): void {
  //   if (confirm('Are you sure you want to delete this store and all its branches?')) {
  //     this.storeService.deleteStore(id).subscribe(() => {
  //       this.adminService.logAction('store', id, 'DELETE', 1);
  //       this.loadStores();
  //     });
  //   }
  // }
}
export { TranslationService } from '../../../core/services/translation.service';
