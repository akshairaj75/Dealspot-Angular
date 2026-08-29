import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FlyerService } from '../../../core/services/flyer.service';
import { StoreService } from '../../../core/services/store.service';
import { CityService } from '../../../core/services/city.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-flyers-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CustomSelectComponent],
  templateUrl: './flyers-crud.component.html',
  styleUrl: './flyers-crud.component.css'
})
export class FlyersCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private flyerService = inject(FlyerService);
  private storeService = inject(StoreService);
  private cityService = inject(CityService);
  public authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  flyers = signal<any[]>([]);
  stores = signal<any[]>([]);
  cities = signal<any[]>([]);
  filteredFlyers = signal<any[]>([]);
  searchQuery = '';

  flyerForm!: FormGroup;
  isModalOpen = false;
  editingFlyerId: number | null = null;
  loading = false;

  // File uploads
  selectedPageFiles: File[] = [];
  pagePreviewUrls: string[] = [];
  existingPages: any[] = [];
  selectedPdfFile: File | null = null;
  pdfFileName: string = '';
  existingPdfUrl: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadFlyers();
    this.loadDropdowns();
  }

  initForm(): void {
    this.flyerForm = this.fb.group({
      title_en: ['', Validators.required],
      title_ar: ['', Validators.required],
      store_id: ['', Validators.required],
      city_id: ['', Validators.required],
      valid_from: ['', Validators.required],
      valid_until: ['', Validators.required],
      description_en: [''],
      description_ar: [''],
      is_active: [true]
    });
  }

  loadFlyers(): void {
    this.loading = true;
    const storeId = this.authService.isStoreManager() && this.authService.currentUser()?.storeId
      ? Number(this.authService.currentUser()?.storeId)
      : undefined;

    this.flyerService.getAllFlyers(storeId).subscribe({
      next: (res) => {
        this.flyers.set(res || []);
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flyers:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }


  loadDropdowns(): void {
    this.storeService.getStores().subscribe({
      next: (res) => {
        this.stores.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load stores:', err)
    });

    this.cityService.getCities().subscribe({
      next: (res) => {
        this.cities.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredFlyers.set(this.flyers());
      return;
    }

    const filtered = this.flyers().filter(f =>
      (f.titleEn && f.titleEn.toLowerCase().includes(query)) ||
      (f.titleAr && f.titleAr.toLowerCase().includes(query)) ||
      (f.storeNameEn && f.storeNameEn.toLowerCase().includes(query)) ||
      (f.storeNameAr && f.storeNameAr.toLowerCase().includes(query)) ||
      (f.cityNameEn && f.cityNameEn.toLowerCase().includes(query)) ||
      (f.id && f.id.toString().includes(query))
    );
    this.filteredFlyers.set(filtered);
  }

  openAddModal(): void {
    this.editingFlyerId = null;
    this.selectedPageFiles = [];
    this.pagePreviewUrls = [];
    this.existingPages = [];
    this.selectedPdfFile = null;
    this.pdfFileName = '';
    this.existingPdfUrl = null;

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const defaultStoreId = (this.authService.isStoreManager() && this.authService.currentUser()?.storeId)
      ? this.authService.currentUser()?.storeId
      : (this.stores().length > 0 ? this.stores()[0].id : '');

    this.flyerForm.reset({
      title_en: '',
      title_ar: '',
      store_id: defaultStoreId,
      city_id: this.cities().length > 0 ? this.cities()[0].id : '',
      valid_from: today,
      valid_until: nextWeek,
      description_en: '',
      description_ar: '',
      is_active: true
    });
    this.isModalOpen = true;
  }


  openEditModal(f: any): void {
    this.editingFlyerId = f.id;
    this.selectedPageFiles = [];
    this.pagePreviewUrls = [];
    this.existingPages = f.pages || [];
    this.selectedPdfFile = null;
    this.pdfFileName = '';
    this.existingPdfUrl = f.pdfUrl || null;

    this.flyerForm.reset({
      title_en: f.titleEn || f.title_en || '',
      title_ar: f.titleAr || f.title_ar || '',
      store_id: f.storeId || f.store_id || '',
      city_id: f.cityId || f.city_id || '',
      valid_from: f.validFrom || f.valid_from || '',
      valid_until: f.validUntil || f.valid_until || '',
      description_en: f.descriptionEn || f.description_en || '',
      description_ar: f.descriptionAr || f.description_ar || '',
      is_active: f.active === true || f.active === 1 || f.isActive === true || f.is_active === 1
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onPageFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.selectedPageFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.pagePreviewUrls.push(e.target.result);
          this.cd.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removePageFile(index: number): void {
    this.selectedPageFiles.splice(index, 1);
    this.pagePreviewUrls.splice(index, 1);
  }

  onPdfFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedPdfFile = file;
      this.pdfFileName = file.name;
    }
  }

  removePdfFile(): void {
    this.selectedPdfFile = null;
    this.pdfFileName = '';
  }

  getCoverImageUrl(flyer: any): string {
    const url = flyer.coverImageUrl || flyer.cover_image_url;
    if (!url) return 'https://placehold.co/100x140?text=No+Cover';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  getPageImageUrl(page: any): string {
    const url = page.imageUrl || page.thumbUrl;
    if (!url) return 'https://placehold.co/100x140?text=Page';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  onSubmit(): void {
    if (this.flyerForm.invalid) {
      this.flyerForm.markAllAsTouched();
      return;
    }

    if (!this.editingFlyerId && this.selectedPageFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.currentLang() === 'en' ? 'Pages Required' : 'الصفحات مطلوبة',
        text: this.currentLang() === 'en' ? 'Please upload at least one page image for the flyer.' : 'يرجى تحميل صفحة واحدة على الأقل للمنشور.'
      });
      return;
    }

    const val = this.flyerForm.value;
    const flyerData = {
      storeId: Number(val.store_id),
      cityId: Number(val.city_id),
      titleEn: val.title_en,
      titleAr: val.title_ar,
      descriptionEn: val.description_en || '',
      descriptionAr: val.description_ar || '',
      validFrom: val.valid_from,
      validUntil: val.valid_until,
      active: !!val.is_active
    };

    const formData = new FormData();
    formData.append(
      'data',
      new Blob([JSON.stringify(flyerData)], { type: 'application/json' })
    );

    // Append page images
    if (this.selectedPageFiles.length > 0) {
      for (const pageFile of this.selectedPageFiles) {
        formData.append('pages', pageFile);
      }
    }

    // Append optional PDF
    if (this.selectedPdfFile) {
      formData.append('pdf', this.selectedPdfFile);
    }

    const request = this.editingFlyerId
      ? this.flyerService.updateFlyer(this.editingFlyerId, formData)
      : this.flyerService.addFlyer(formData);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingFlyerId ? 'Updated!' : 'Created!') : (this.editingFlyerId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingFlyerId ? 'Flyer updated successfully.' : 'Flyer created successfully.')
            : (this.editingFlyerId ? 'تم تحديث المنشور بنجاح.' : 'تم إنشاء المنشور بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadFlyers();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save flyer:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save flyer.' : 'فشل حفظ المنشور.')
        });
      }
    });
  }

  deleteFlyer(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en'
        ? 'Do you want to delete this flyer and all its catalogue pages?'
        : 'هل تريد حذف هذا المنشور وجميع صفحاته؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.flyerService.deleteFlyer(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Flyer has been deleted.' : 'تم حذف المنشور بنجاح.',
              'success'
            );
            this.loadFlyers();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete flyer.' : 'فشل حذف المنشور.',
              'error'
            );
          }
        });
      }
    });
  }
}
