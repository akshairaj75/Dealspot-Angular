import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrandService } from '../../../core/services/brand.service';
import { TranslationService } from '../../../core/services/translation.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-brands-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './brands-crud.component.html',
  styleUrl: './brands-crud.component.css'
})
export class BrandsCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;
  brands = signal<any[]>([]);
  filteredBrands = signal<any[]>([]);
  
  brandForm!: FormGroup;
  isModalOpen = false;
  editingBrandId: number | null = null;
  searchQuery = '';
  filePath = environment.filePath;
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  ngOnInit(): void {
    this.loadBrands();
    this.brandForm = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      sortOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  loadBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        // Sort brands by sortOrder by default
        const sorted = res.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        this.brands.set(sorted);
        console.log(res,"brands")
        this.applyFilter();
      },
      error: (err) => {
        console.error('Error loading brands:', err);
      }
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredBrands.set(this.brands());
      return;
    }

    const filtered = this.brands().filter(b => 
      (b.nameEn && b.nameEn.toLowerCase().includes(query)) ||
      (b.nameAr && b.nameAr.toLowerCase().includes(query)) ||
      (b.id && b.id.toString().includes(query))
    );
    this.filteredBrands.set(filtered);
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) {
      return 'https://placehold.co/100x100?text=No+Logo';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  openAddModal(): void {
    this.editingBrandId = null;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    this.brandForm.reset({
      nameEn: '',
      nameAr: '',
      sortOrder: this.brands().length + 1,
      isActive: true
    });
    this.isModalOpen = true;
  }

  openEditModal(brand: any): void {
    this.editingBrandId = brand.id;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = brand.logoUrl ? this.getLogoUrl(brand.logoUrl) : null;
    this.brandForm.patchValue({
      nameEn: brand.nameEn || brand.name_en,
      nameAr: brand.nameAr || brand.name_ar,
      sortOrder: brand.sortOrder || 1,
      isActive: brand.active === 1 || brand.active === true || brand.isActive === 1 || brand.isActive === true
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
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

  removeSelectedLogo(): void {
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
  }

  onSubmit(): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    const val = this.brandForm.value;

    // Check duplicate
    const isDuplicate = this.brands().some(b => {
      if (this.editingBrandId && b.id === this.editingBrandId) {
        return false;
      }
      return (
        (b.nameEn && b.nameEn.toLowerCase().trim() === val.nameEn.toLowerCase().trim()) ||
        (b.nameAr && b.nameAr.toLowerCase().trim() === val.nameAr.toLowerCase().trim())
      );
    });

    if (isDuplicate) {
      Swal.fire({
        icon: 'warning',
        title: this.currentLang() === 'en' ? 'Duplicate Brand' : 'علامة تجارية مكررة',
        text: this.currentLang() === 'en' 
          ? 'A brand with this English or Arabic name already exists!' 
          : 'هناك علامة تجارية بهذا الاسم باللغة الإنجليزية أو العربية بالفعل!',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const brandData = {
      nameEn: val.nameEn,
      nameAr: val.nameAr,
      sortOrder: Number(val.sortOrder),
      active: val.isActive ? true : false
    };

    const formData = new FormData();
    formData.append(
      'data',
      new Blob([JSON.stringify(brandData)], {
        type: 'application/json'
      })
    );

    if (this.selectedLogoFile) {
      formData.append('logoFile', this.selectedLogoFile);
    }

    const request = this.editingBrandId
      ? this.brandService.updateBrand(this.editingBrandId, formData)
      : this.brandService.createBrand(formData);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingBrandId ? 'Updated!' : 'Added!') : (this.editingBrandId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingBrandId ? 'Brand updated successfully.' : 'Brand added successfully.')
            : (this.editingBrandId ? 'تم تحديث العلامة التجارية بنجاح.' : 'تم إضافة العلامة التجارية بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadBrands();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: this.currentLang() === 'en'
            ? (this.editingBrandId ? 'Failed to update brand.' : 'Failed to add brand.')
            : (this.editingBrandId ? 'فشل تحديث العلامة التجارية.' : 'فشل إضافة العلامة التجارية.')
        });
      }
    });
  }

  deleteBrand(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' 
        ? 'Do you want to delete this brand?' 
        : 'هل تريد حذف هذه العلامة التجارية؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذفها!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.brandService.deleteBrand(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Brand has been deleted.' : 'تم حذف العلامة التجارية.',
              'success'
            );
            this.loadBrands();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete brand.' : 'فشل حذف العلامة التجارية.',
              'error'
            );
          }
        });
      }
    });
  }
}
