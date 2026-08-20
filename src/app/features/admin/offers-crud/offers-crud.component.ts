import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { OfferService } from '../../../core/services/offer.service';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CityService } from '../../../core/services/city.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-offers-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './offers-crud.component.html',
  styleUrl: './offers-crud.component.css'
})
export class OffersCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private offerService = inject(OfferService);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cityService = inject(CityService);
  public authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  offers = signal<any[]>([]);
  stores = signal<any[]>([]);
  products = signal<any[]>([]);
  categories = signal<any[]>([]);
  cities = signal<any[]>([]);
  filteredOffers = signal<any[]>([]);

  searchQuery = '';
  selectedStoreFilter: number | string = '';
  selectedBadgeFilter: string = '';

  offerForm!: FormGroup;
  isModalOpen = false;
  editingOfferId: number | null = null;
  loading = false;

  // Image upload
  selectedImageFiles: File[] = [];
  imagePreviewUrls: string[] = [];
  existingImageUrl: string | null = null;

  ngOnInit(): void {
    if (this.authService.isStoreManager() && this.authService.currentUser()?.storeId) {
      this.selectedStoreFilter = this.authService.currentUser()?.storeId!;
    }
    this.initForm();
    this.loadOffers();
    this.loadDropdowns();
  }


  initForm(): void {
    this.offerForm = this.fb.group({
      title_en: ['', Validators.required],
      title_ar: ['', Validators.required],
      store_id: ['', Validators.required],
      category_id: ['', Validators.required],
      city_id: ['', Validators.required],
      product_id: [null],
      original_price: [0, [Validators.required, Validators.min(0)]],
      offer_price: [0, [Validators.required, Validators.min(0)]],
      discount_pct: [{ value: 0, disabled: true }],
      badge_type: ['NONE', Validators.required],
      valid_from: ['', Validators.required],
      valid_until: ['', Validators.required],
      description_en: [''],
      description_ar: [''],
      terms_en: [''],
      terms_ar: [''],
      is_featured: [false],
      is_flash: [false],
      is_online: [false],
      is_in_store: [true],
      is_active: [true]
    });

    // Auto-calculate discount percentage
    this.offerForm.valueChanges.subscribe(val => {
      const orig = Number(val.original_price);
      const offer = Number(val.offer_price);
      if (orig > 0 && offer >= 0 && offer <= orig) {
        const pct = Math.round(((orig - offer) / orig) * 100);
        this.offerForm.get('discount_pct')?.setValue(pct, { emitEvent: false });
      } else {
        this.offerForm.get('discount_pct')?.setValue(0, { emitEvent: false });
      }
    });
  }

  loadOffers(): void {
    this.loading = true;
    const storeId = this.authService.isStoreManager() && this.authService.currentUser()?.storeId
      ? Number(this.authService.currentUser()?.storeId)
      : (this.selectedStoreFilter ? Number(this.selectedStoreFilter) : undefined);

    this.offerService.getAllOffers(storeId).subscribe({
      next: (res) => {
        this.offers.set(res || []);
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load offers:', err);
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

    this.productService.getProducts().subscribe({
      next: (res) => {
        this.products.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load products:', err)
    });

    this.categoryService.getCategories().subscribe({
      next: (res: any) => {
        const cats = Array.isArray(res) ? res : (res?.data || []);
        this.categories.set(cats);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
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
    let list = this.offers();

    if (query) {
      list = list.filter(o =>
        (o.titleEn && o.titleEn.toLowerCase().includes(query)) ||
        (o.titleAr && o.titleAr.toLowerCase().includes(query)) ||
        (o.storeNameEn && o.storeNameEn.toLowerCase().includes(query)) ||
        (o.storeNameAr && o.storeNameAr.toLowerCase().includes(query)) ||
        (o.categoryNameEn && o.categoryNameEn.toLowerCase().includes(query)) ||
        (o.id && o.id.toString().includes(query))
      );
    }

    if (this.selectedStoreFilter) {
      list = list.filter(o => o.storeId === Number(this.selectedStoreFilter) || o.store_id === Number(this.selectedStoreFilter));
    }

    if (this.selectedBadgeFilter) {
      list = list.filter(o => o.badgeType === this.selectedBadgeFilter || o.badge_type === this.selectedBadgeFilter);
    }

    this.filteredOffers.set(list);
  }

  openAddModal(): void {
    this.editingOfferId = null;
    this.selectedImageFiles = [];
    this.imagePreviewUrls = [];
    this.existingImageUrl = null;

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const defaultStoreId = (this.authService.isStoreManager() && this.authService.currentUser()?.storeId)
      ? this.authService.currentUser()?.storeId
      : (this.stores().length > 0 ? this.stores()[0].id : '');

    this.offerForm.reset({
      title_en: '',
      title_ar: '',
      store_id: defaultStoreId,
      category_id: this.categories().length > 0 ? this.categories()[0].id : '',
      city_id: this.cities().length > 0 ? this.cities()[0].id : '',
      product_id: null,
      original_price: 0,
      offer_price: 0,
      discount_pct: 0,
      badge_type: 'NONE',
      valid_from: today,
      valid_until: nextWeek,
      description_en: '',
      description_ar: '',
      terms_en: '',
      terms_ar: '',
      is_featured: false,
      is_flash: false,
      is_online: false,
      is_in_store: true,
      is_active: true
    });
    this.isModalOpen = true;
  }


  openEditModal(o: any): void {
    this.editingOfferId = o.id;
    this.selectedImageFiles = [];
    this.imagePreviewUrls = [];
    this.existingImageUrl = o.imageUrl || o.thumbnailUrl || o.image_url || null;

    this.offerForm.reset({
      title_en: o.titleEn || o.title_en || '',
      title_ar: o.titleAr || o.title_ar || '',
      store_id: o.storeId || o.store_id || '',
      category_id: o.categoryId || o.category_id || '',
      city_id: o.cityId || o.city_id || '',
      product_id: o.productId || o.product_id || null,
      original_price: o.originalPrice || o.original_price || 0,
      offer_price: o.offerPrice || o.offer_price || 0,
      discount_pct: o.discountPct || o.discount_pct || 0,
      badge_type: o.badgeType || o.badge_type || 'NONE',
      valid_from: o.validFrom || o.valid_from || '',
      valid_until: o.validUntil || o.valid_until || '',
      description_en: o.descriptionEn || o.description_en || '',
      description_ar: o.descriptionAr || o.description_ar || '',
      terms_en: o.termsEn || o.terms_en || '',
      terms_ar: o.termsAr || o.terms_ar || '',
      is_featured: o.featured === true || o.is_featured === 1 || o.is_featured === true,
      is_flash: o.flash === true || o.is_flash === 1 || o.is_flash === true,
      is_online: o.online === true || o.is_online === 1 || o.is_online === true,
      is_in_store: o.inStore === true || o.is_in_store === 1 || o.is_in_store === true || o.inStore === undefined,
      is_active: o.active === true || o.is_active === 1 || o.is_active === true || o.active === undefined
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onImageFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.selectedImageFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
          this.cd.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeImageFile(index: number): void {
    this.selectedImageFiles.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  getImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Cpath fill='%23cbd5e1' d='M160 110a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm100 120H140l50-65 35 45 25-30 40 50z'/%3E%3Ctext x='50%25' y='82%25' text-anchor='middle' fill='%2394a3b8' font-family='sans-serif' font-size='14' font-weight='500'%3EDealSpot%3C/text%3E%3C/svg%3E";
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  onSubmit(): void {
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    const val = this.offerForm.getRawValue();
    const offerData = {
      storeId: Number(val.store_id),
      cityId: Number(val.city_id),
      categoryId: Number(val.category_id),
      productId: val.product_id ? Number(val.product_id) : null,
      titleEn: val.title_en,
      titleAr: val.title_ar,
      descriptionEn: val.description_en || '',
      descriptionAr: val.description_ar || '',
      termsEn: val.terms_en || '',
      termsAr: val.terms_ar || '',
      originalPrice: Number(val.original_price),
      offerPrice: Number(val.offer_price),
      discountPct: Number(val.discount_pct),
      badgeType: val.badge_type,
      validFrom: val.valid_from,
      validUntil: val.valid_until,
      featured: !!val.is_featured,
      flash: !!val.is_flash,
      online: !!val.is_online,
      inStore: !!val.is_in_store,
      active: !!val.is_active
    };

    let request;

    if (this.selectedImageFiles.length > 0) {
      const formData = new FormData();
      formData.append(
        'data',
        new Blob([JSON.stringify(offerData)], { type: 'application/json' })
      );
      for (const img of this.selectedImageFiles) {
        formData.append('files', img);
      }

      request = this.editingOfferId
        ? this.offerService.updateOffer(this.editingOfferId, formData)
        : this.offerService.createOffer(formData);
    } else {
      // JSON submission
      request = this.editingOfferId
        ? this.offerService.updateOffer(this.editingOfferId, offerData)
        : this.offerService.createOffer(offerData);
    }

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingOfferId ? 'Updated!' : 'Created!') : (this.editingOfferId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingOfferId ? 'Offer updated successfully.' : 'Offer created successfully.')
            : (this.editingOfferId ? 'تم تحديث العرض بنجاح.' : 'تم إنشاء العرض بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadOffers();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save offer:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save offer.' : 'فشل حفظ العرض.')
        });
      }
    });
  }

  deleteOffer(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en'
        ? 'Do you really want to delete this promotional offer?'
        : 'هل تريد حقاً حذف هذا العرض الترويجي؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.offerService.deleteOffer(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Offer has been deleted.' : 'تم حذف العرض بنجاح.',
              'success'
            );
            this.loadOffers();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete offer.' : 'فشل حذف العرض.',
              'error'
            );
          }
        });
      }
    });
  }
}
