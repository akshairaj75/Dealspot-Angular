import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandService } from '../../../core/services/brand.service';
import { CategoryService } from '../../../core/services/category.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-brand-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './brand-detail.component.html',
  styleUrls: ['./brand-detail.component.css']
})
export class BrandDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  public translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  brandId!: number;
  brand = signal<any | null>(null);
  categories = signal<any[]>([]);

  loading = signal<boolean>(true);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  brandForm!: FormGroup;
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  categorySearch = '';
  isCategoryDropdownOpen = false;

  ngOnInit(): void {
    this.initForm();

    // Instant state hydration from router state if available
    const navState = history.state;
    if (navState && navState.brand && Number(navState.brand.id) > 0) {
      this.brand.set(navState.brand);
      this.populateForm(navState.brand);
      this.loading.set(false);
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.brandId = Number(id);
        const hasInitialData = !!this.brand();
        this.loadBrandDetails(!hasInitialData);
      }
    });
  }

  initForm(): void {
    this.brandForm = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      descriptionEn: [''],
      descriptionAr: [''],
      websiteUrl: [''],
      categoryIds: [[]],
      isFeatured: [false],
      isActive: [true]
    });
  }

  loadBrandDetails(showSpinner: boolean = true): void {
    if (showSpinner) {
      this.loading.set(true);
    }
    this.brandService.getBrand(this.brandId).subscribe({
      next: (res) => {
        this.brand.set(res);
        this.populateForm(res);
        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading brand details:', err);
        if (showSpinner) {
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: this.currentLang() === 'en' ? 'Brand Not Found' : 'العلامة التجارية غير موجودة',
            text: this.currentLang() === 'en' ? 'Unable to load brand details.' : 'تعذر تحميل بيانات العلامة التجارية.'
          }).then(() => {
            this.router.navigate(['/admin/brands']);
          });
        }
      }
    });
  }

  loadCategories(): void {
    if (this.categories().length > 0) return;
    this.categoryService.getCategories().subscribe({
      next: (res: any[]) => this.categories.set(res || []),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  populateForm(b: any): void {
    if (!b) return;
    const catIds = (b.categories || []).map((c: any) => c.id);

    this.brandForm.patchValue({
      nameEn: b.nameEn || b.name_en || '',
      nameAr: b.nameAr || b.name_ar || '',
      descriptionEn: b.descriptionEn || b.description_en || '',
      descriptionAr: b.descriptionAr || b.description_ar || '',
      websiteUrl: b.websiteUrl || b.website_url || '',
      categoryIds: catIds,
      isFeatured: b.featured === true || b.isFeatured === true,
      isActive: b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true
    });

    if (b.logoUrl) {
      this.logoPreviewUrl = this.getLogoUrl(b.logoUrl);
    } else {
      this.logoPreviewUrl = null;
    }
  }

  getLogoUrl(url: string | null): string {
    if (!url) return 'assets/images/placeholder-brand.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.filePath + url;
  }

  toggleEditMode(): void {
    const next = !this.isEditMode();
    this.isEditMode.set(next);
    if (next) {
      this.loadCategories();
      if (this.brand()) {
        this.populateForm(this.brand());
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Category selection helpers ---
  getFilteredCategories(): any[] {
    if (!this.categorySearch.trim()) return this.categories();
    const query = this.categorySearch.toLowerCase().trim();
    return this.categories().filter(c => 
      (c.nameEn && c.nameEn.toLowerCase().includes(query)) ||
      (c.nameAr && c.nameAr.toLowerCase().includes(query))
    );
  }

  isCategorySelected(catId: number): boolean {
    const selected: number[] = this.brandForm.get('categoryIds')?.value || [];
    return selected.includes(catId);
  }

  toggleCategory(catId: number): void {
    const current: number[] = [...(this.brandForm.get('categoryIds')?.value || [])];
    const index = current.indexOf(catId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(catId);
    }
    this.brandForm.patchValue({ categoryIds: current });
    this.brandForm.get('categoryIds')?.markAsDirty();
  }

  getSelectedCategoryObjects(): any[] {
    const selectedIds: number[] = this.brandForm.get('categoryIds')?.value || [];
    return this.categories().filter(c => selectedIds.includes(c.id));
  }

  selectAllCategories(): void {
    const allIds = this.categories().map(c => c.id);
    this.brandForm.patchValue({ categoryIds: allIds });
  }

  clearAllCategories(): void {
    this.brandForm.patchValue({ categoryIds: [] });
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  closeCategoryDropdown(): void {
    this.isCategoryDropdownOpen = false;
  }

  onSaveBrand(): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: this.currentLang() === 'en' ? 'Missing Fields' : 'بيانات مفقودة',
        text: this.currentLang() === 'en' ? 'Please enter English and Arabic brand names.' : 'يرجى إدخال اسم العلامة بالإنجليزية والعربية.'
      });
      return;
    }

    this.isSaving.set(true);
    const val = this.brandForm.value;

    const brandData = {
      nameEn: val.nameEn,
      nameAr: val.nameAr,
      descriptionEn: val.descriptionEn || '',
      descriptionAr: val.descriptionAr || '',
      websiteUrl: val.websiteUrl || '',
      featured: !!val.isFeatured,
      active: !!val.isActive,
      categoryIds: val.categoryIds || []
    };

    const formData = new FormData();
    formData.append(
      'data',
      new Blob([JSON.stringify(brandData)], { type: 'application/json' })
    );

    if (this.selectedLogoFile) {
      formData.append('logoFile', this.selectedLogoFile);
    }

    this.brandService.updateBrand(this.brandId, formData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isEditMode.set(false);
        this.loadBrandDetails();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Brand Updated' : 'تم تحديث العلامة التجارية',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.isSaving.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Update Failed' : 'فشل التحديث',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Something went wrong.' : 'حدث خطأ أثناء التحديث.')
        });
      }
    });
  }

  quickToggleActive(): void {
    if (!this.brand()) return;
    const b = this.brand();
    const currentActive = b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true;
    const newActive = !currentActive;

    const brandData = {
      nameEn: b.nameEn || b.name_en,
      nameAr: b.nameAr || b.name_ar,
      descriptionEn: b.descriptionEn || b.description_en || '',
      descriptionAr: b.descriptionAr || b.description_ar || '',
      websiteUrl: b.websiteUrl || b.website_url || '',
      featured: b.featured === true || b.isFeatured === true,
      active: newActive,
      categoryIds: (b.categories || []).map((c: any) => c.id)
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(brandData)], { type: 'application/json' }));

    this.brandService.updateBrand(this.brandId, formData).subscribe({
      next: () => {
        this.loadBrandDetails();
        Swal.fire({
          icon: 'success',
          title: newActive ? (this.currentLang() === 'en' ? 'Brand Activated' : 'تم تفعيل العلامة التجارية') : (this.currentLang() === 'en' ? 'Brand Deactivated' : 'تم إلغاء تفعيل العلامة التجارية'),
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err) => console.error('Failed to toggle status:', err)
    });
  }

  quickToggleFeatured(): void {
    if (!this.brand()) return;
    const b = this.brand();
    const currentFeatured = b.featured === true || b.isFeatured === true;
    const newFeatured = !currentFeatured;

    const brandData = {
      nameEn: b.nameEn || b.name_en,
      nameAr: b.nameAr || b.name_ar,
      descriptionEn: b.descriptionEn || b.description_en || '',
      descriptionAr: b.descriptionAr || b.description_ar || '',
      websiteUrl: b.websiteUrl || b.website_url || '',
      featured: newFeatured,
      active: b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true,
      categoryIds: (b.categories || []).map((c: any) => c.id)
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(brandData)], { type: 'application/json' }));

    this.brandService.updateBrand(this.brandId, formData).subscribe({
      next: () => {
        this.loadBrandDetails();
        Swal.fire({
          icon: 'success',
          title: newFeatured ? (this.currentLang() === 'en' ? 'Marked as Featured' : 'ميزت كعلامة بارزة') : (this.currentLang() === 'en' ? 'Removed from Featured' : 'أزيلت من العلامات البارزة'),
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err) => console.error('Failed to toggle featured:', err)
    });
  }

  deleteBrand(): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Brand?' : 'حذف العلامة التجارية؟',
      text: this.currentLang() === 'en' ? 'This action cannot be undone.' : 'لا يمكن التراجع عن هذا الإجراء.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete' : 'نعم، احذف',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.brandService.deleteBrand(this.brandId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted Successfully' : 'تم الحذف بنجاح',
              timer: 1500,
              showConfirmButton: false
            }).then(() => {
              this.router.navigate(['/admin/brands']);
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Delete Failed' : 'فشل الحذف',
              text: err?.error?.message || ''
            });
          }
        });
      }
    });
  }
}
