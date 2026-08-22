import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stores-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './stores-crud.component.html',
  styleUrls: ['./stores-crud.component.css']
})
export class StoresCrudComponent implements OnInit {

  private fb = inject(FormBuilder);
  private storeService = inject(StoreService);
  private cityService = inject(CityService);
  private categoryService = inject(CategoryService);
  public authService = inject(AuthService);
  public translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  stores = signal<any[]>([]);
  cities = signal<any[]>([]);
  categories = signal<any[]>([]);
  filteredStores = signal<any[]>([]);

  searchQuery = '';
  selectedCityFilter: number | string = '';
  selectedCategoryFilter: number | string = '';
  selectedStatusFilter: string = '';

  storeForm!: FormGroup;
  isModalOpen = false;
  editingStoreId: number | null = null;
  loading = false;
  submitting = false;

  // Logo file upload state
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  existingLogoUrl: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadStores();
    this.loadDropdowns();
  }

  initForm(): void {
    this.storeForm = this.fb.group({
      name_en: ['', [Validators.required, Validators.minLength(2)]],
      name_ar: ['', [Validators.required, Validators.minLength(2)]],
      city_id: ['', Validators.required],
      category_id: ['', Validators.required],
      description_en: [''],
      description_ar: [''],
      cr_number: [''],
      vat_number: [''],
      contact_phone: [''],
      contact_email: ['', [Validators.email]],
      website: [''],
      create_manager_account: [true],
      manager_name: [''],
      manager_email: ['', [Validators.email]],
      manager_password: ['Partner@123'],
      is_verified: [false],
      is_active: [true]
    });
  }

  loadStores(): void {
    this.loading = true;
    this.storeService.getStores().subscribe({
      next: (res: any[]) => {
        const user = this.authService.currentUser();
        let list = res || [];
        if (this.authService.isStoreManager() && user?.storeId) {
          list = list.filter(s => s.id === Number(user.storeId));
        }
        this.stores.set(list);
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load stores:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  loadDropdowns(): void {
    this.cityService.getCities().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.cities.set(list);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });

    this.categoryService.getCategories().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        const topLevel = list.filter((c: any) => c.parentId === null || c.parentId === undefined);
        this.categories.set(topLevel.length > 0 ? topLevel : list);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    let list = this.stores();

    if (query) {
      list = list.filter(s =>
        (s.nameEn && s.nameEn.toLowerCase().includes(query)) ||
        (s.nameAr && s.nameAr.toLowerCase().includes(query)) ||
        (s.crNumber && s.crNumber.toLowerCase().includes(query)) ||
        (s.vatNumber && s.vatNumber.toLowerCase().includes(query)) ||
        (s.cityNameEn && s.cityNameEn.toLowerCase().includes(query)) ||
        (s.id && s.id.toString().includes(query))
      );
    }

    if (this.selectedCityFilter) {
      list = list.filter(s => s.cityId === Number(this.selectedCityFilter));
    }

    if (this.selectedCategoryFilter) {
      list = list.filter(s => s.categoryId === Number(this.selectedCategoryFilter));
    }

    if (this.selectedStatusFilter === 'active') {
      list = list.filter(s => s.active === true);
    } else if (this.selectedStatusFilter === 'inactive') {
      list = list.filter(s => s.active === false);
    } else if (this.selectedStatusFilter === 'verified') {
      list = list.filter(s => s.verified === true);
    }

    this.filteredStores.set(list);
  }

  get totalStoresCount(): number {
    return this.stores().length;
  }

  get verifiedStoresCount(): number {
    return this.stores().filter(s => s.verified).length;
  }

  get activeStoresCount(): number {
    return this.stores().filter(s => s.active).length;
  }

  onLogoFileSelected(event: any): void {
    const file: File = event.target.files?.[0];
    if (file) {
      this.selectedLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreviewUrl = e.target.result;
        this.cd.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedLogo(): void {
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
  }

  openAddModal(): void {
    this.editingStoreId = null;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    this.existingLogoUrl = null;

    this.storeForm.reset({
      name_en: '',
      name_ar: '',
      city_id: this.cities().length > 0 ? this.cities()[0].id : '',
      category_id: this.categories().length > 0 ? this.categories()[0].id : '',
      description_en: '',
      description_ar: '',
      cr_number: '',
      vat_number: '',
      contact_phone: '',
      contact_email: '',
      website: '',
      create_manager_account: true,
      manager_name: '',
      manager_email: '',
      manager_password: 'Partner@123',
      is_verified: false,
      is_active: true
    });

    this.isModalOpen = true;
  }

  openEditModal(store: any): void {
    this.editingStoreId = store.id;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    this.existingLogoUrl = store.logoUrl || null;

    this.storeForm.patchValue({
      name_en: store.nameEn || store.name_en || '',
      name_ar: store.nameAr || store.name_ar || '',
      city_id: store.cityId || store.city_id || (store.city ? store.city.id : ''),
      category_id: store.categoryId || store.category_id || (store.category ? store.category.id : ''),
      description_en: store.descriptionEn || store.description_en || '',
      description_ar: store.descriptionAr || store.description_ar || '',
      cr_number: store.crNumber || store.cr_number || '',
      vat_number: store.vatNumber || store.vat_number || '',
      contact_phone: store.contactPhone || store.contact_phone || '',
      contact_email: store.contactEmail || store.contact_email || '',
      website: store.website || '',
      is_verified: store.verified === true || store.is_verified === true,
      is_active: store.active === true || store.is_active === true
    });

    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingStoreId = null;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
  }

  onSubmit(): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const val = this.storeForm.value;

    const payload: any = {
      nameEn: val.name_en,
      nameAr: val.name_ar,
      cityId: Number(val.city_id),
      categoryId: Number(val.category_id),
      descriptionEn: val.description_en || '',
      descriptionAr: val.description_ar || '',
      crNumber: val.cr_number || '',
      vatNumber: val.vat_number || '',
      contactPhone: val.contact_phone || '',
      contactEmail: val.contact_email || '',
      website: val.website || '',
      verified: !!val.is_verified,
      active: !!val.is_active
    };

    if (!this.editingStoreId && val.create_manager_account) {
      payload.managerName = val.manager_name || val.name_en;
      payload.managerEmail = val.manager_email || val.contact_email;
      payload.managerPassword = val.manager_password || 'Partner@123';
    }


    const formData = new FormData();
    formData.append(
      'body',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    if (this.selectedLogoFile) {
      formData.append('file', this.selectedLogoFile);
    }

    const request = this.editingStoreId
      ? this.storeService.updateStore(this.editingStoreId, formData)
      : this.storeService.createStore(formData);

    request.subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadStores();
        Swal.fire({
          icon: 'success',
          title: this.editingStoreId
            ? (this.currentLang() === 'en' ? 'Store Updated!' : 'تم تحديث المتجر بنجاح!')
            : (this.currentLang() === 'en' ? 'Store Created!' : 'تم إنشاء المتجر بنجاح!'),
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Store Save Error:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Save Failed' : 'فشل الحفظ',
          text: err.error?.message || 'Failed to save store profile. Please check all fields.'
        });
      }
    });
  }

  deleteStore(store: any): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Store?' : 'حذف المتجر؟',
      html: `<p>${this.currentLang() === 'en'
        ? `Are you sure you want to delete <b>${store.nameEn}</b>? All associated branches, offers, and flyers will be removed.`
        : `هل أنت متأكد من حذف متجر <b>${store.nameAr}</b>؟ سيتم حذف جميع الفروع والعروض والمنشورات المرتبطة به.`}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete' : 'نعم، حذف',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((res) => {
      if (res.isConfirmed) {
        this.storeService.deleteStore(store.id).subscribe({
          next: () => {
            this.loadStores();
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              text: this.currentLang() === 'en' ? 'Store deleted successfully.' : 'تم حذف المتجر بنجاح.',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Delete Failed' : 'فشل الحذف',
              text: err.error?.message || 'Failed to delete store.'
            });
          }
        });
      }
    });
  }
}
