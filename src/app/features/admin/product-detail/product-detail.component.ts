import { Component, inject, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { BrandService } from '../../../core/services/brand.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  public translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  productId!: number;
  product = signal<any | null>(null);
  specs = signal<any[]>([]);
  allCategories = signal<any[]>([]);
  mainCategories = signal<any[]>([]);
  availableSubcategories = signal<any[]>([]);
  brands = signal<any[]>([]);
  isBrandDropdownOpen = false;
  brandSearchQuery = '';
  private brandSearchSubject = new Subject<string>();
  private brandSearchSub?: Subscription;
  brandsCurrentPage = 0;
  hasMoreBrands = signal<boolean>(false);
  loadingBrands = signal<boolean>(false);
  loadingMoreBrands = signal<boolean>(false);

  loading = signal<boolean>(true);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Form & Image preview
  productForm!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Category hierarchy selection in form
  selectedMainCategoryId: number | null = null;
  selectedSubCategoryId: number | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    // Instant state hydration from router state if available
    const navState = history.state;
    if (navState && navState.product && Number(navState.product.id) > 0) {
      this.product.set(navState.product);
      this.populateForm(navState.product);
      this.loading.set(false);
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId = Number(id);
        const hasInitialData = !!this.product();
        this.loadProductDetails(!hasInitialData);
        this.loadProductSpecs();
      }
    });

    this.brandSearchSub = this.brandSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.brandSearchQuery = query;
      this.loadBrands(query, 0, false);
    });
  }

  ngOnDestroy(): void {
    this.brandSearchSub?.unsubscribe();
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      brandId: [null, Validators.required],
      sku: [''],
      barcode: [''],
      category_id: [null, Validators.required],
      unit: ['EACH', Validators.required],
      unit_size: [1, Validators.required],
      description_en: [''],
      description_ar: [''],
      is_active: [true]
    });
  }

  loadProductDetails(showSpinner: boolean = true): void {
    if (showSpinner) {
      this.loading.set(true);
    }
    this.productService.getProductById(this.productId).subscribe({
      next: (res) => {
        this.product.set(res);
        if (res && (res.details || res.specs)) {
          this.specs.set(res.details || res.specs || []);
        }
        this.populateForm(res);
        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching product details:', err);
        if (showSpinner) {
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: this.currentLang() === 'en' ? 'Product Not Found' : 'المنتج غير موجود',
            text: this.currentLang() === 'en' ? 'Unable to load product details.' : 'تعذر تحميل بيانات المنتج.'
          }).then(() => {
            this.router.navigate(['/admin/products']);
          });
        }
      }
    });
  }

  loadProductSpecs(): void {
    this.productService.getProductSpecs(this.productId).subscribe({
      next: (res) => {
        this.specs.set(res || []);
      },
      error: (err) => console.error('Error fetching specs:', err)
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (res: any[]) => {
        this.allCategories.set(res || []);
        const mains = (res || []).filter((c: any) => c.parentId === null || c.parentId === undefined);
        this.mainCategories.set(mains);
        if (this.product()) {
          this.setupCategorySelection(this.product()?.categoryId || this.product()?.category_id);
        }
      },
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  loadBrands(query: string = '', page: number = 0, isAppend: boolean = false): void {
    if (isAppend) {
      this.loadingMoreBrands.set(true);
    } else {
      this.loadingBrands.set(true);
    }

    this.brandService.searchBrands(query, page, 20).subscribe({
      next: (res: any) => {
        const items = res?.content || (Array.isArray(res) ? res : []);
        if (isAppend) {
          this.brands.update(prev => [...prev, ...items]);
        } else {
          this.brands.set(items);
        }
        this.brandsCurrentPage = res?.number ?? page;
        this.hasMoreBrands.set((res?.number + 1) < (res?.totalPages || 0));
        this.loadingBrands.set(false);
        this.loadingMoreBrands.set(false);
      },
      error: (err) => {
        console.error('Failed to load paged brands:', err);
        this.loadingBrands.set(false);
        this.loadingMoreBrands.set(false);
      }
    });
  }

  onBrandSearch(value: string): void {
    this.brandSearchSubject.next(value);
  }

  loadMoreBrands(): void {
    if (!this.hasMoreBrands() || this.loadingMoreBrands()) return;
    this.loadBrands(this.brandSearchQuery, this.brandsCurrentPage + 1, true);
  }

  toggleBrandDropdown(): void {
    this.isBrandDropdownOpen = !this.isBrandDropdownOpen;
    if (this.isBrandDropdownOpen && this.brands().length === 0) {
      this.loadBrands();
    }
  }

  closeBrandDropdown(): void {
    this.isBrandDropdownOpen = false;
  }

  selectBrand(brand: any): void {
    this.productForm.patchValue({ brandId: brand.id });
    this.isBrandDropdownOpen = false;
  }

  getSelectedBrandObject(): any {
    const bId = this.productForm?.get('brandId')?.value;
    if (!bId) return null;
    const found = this.brands().find(b => Number(b.id) === Number(bId));
    if (found) return found;

    const p = this.product();
    if (p && Number(p.brandId || p.brand_id) === Number(bId)) {
      return {
        id: bId,
        nameEn: p.brandNameEn || p.brand,
        nameAr: p.brandNameAr || p.brand,
        logoUrl: p.brandImage || p.brand_image
      };
    }
    return { id: bId, nameEn: `Brand #${bId}`, nameAr: `ماركة #${bId}` };
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return this.filePath + url;
  }

  populateForm(p: any): void {
    if (!p) return;
    const catId = p.categoryId || p.category_id;
    const brandIdVal = p.brandId || p.brand_id || p.brand?.id;

    this.productForm.patchValue({
      name_en: p.nameEn || p.name_en || '',
      name_ar: p.nameAr || p.name_ar || '',
      brandId: brandIdVal || null,
      sku: p.sku || '',
      barcode: p.barcode || '',
      category_id: catId || null,
      unit: p.unit || 'EACH',
      unit_size: p.unitSize || p.unit_size || 1,
      description_en: p.descriptionEn || p.description_en || '',
      description_ar: p.descriptionAr || p.description_ar || '',
      is_active: p.is_active === 1 || p.active === true || p.isActive === true
    });

    if (p.images && p.images.length > 0) {
      this.previewUrl = this.filePath + p.images[0].imageUrl;
    } else if (p.primaryImageUrl || p.primary_image_url) {
      this.previewUrl = this.filePath + (p.primaryImageUrl || p.primary_image_url);
    } else {
      this.previewUrl = null;
    }

    this.setupCategorySelection(catId);
  }

  setupCategorySelection(catId: any): void {
    if (!catId) return;
    const numId = Number(catId);
    const catObj = this.allCategories().find(c => Number(c.id) === numId);
    if (!catObj) return;

    if (catObj.parentId) {
      this.selectedMainCategoryId = Number(catObj.parentId);
      this.onMainCategoryChange(this.selectedMainCategoryId, false);
      this.selectedSubCategoryId = numId;
    } else {
      this.selectedMainCategoryId = numId;
      this.onMainCategoryChange(numId, false);
      this.selectedSubCategoryId = null;
    }
  }

  onMainCategoryChange(mainId: number | null, resetSub: boolean = true): void {
    this.selectedMainCategoryId = mainId;
    if (resetSub) {
      this.selectedSubCategoryId = null;
      this.productForm.patchValue({ category_id: mainId });
    }
    if (mainId) {
      const subs = this.allCategories().filter(c => Number(c.parentId) === Number(mainId));
      this.availableSubcategories.set(subs);
    } else {
      this.availableSubcategories.set([]);
    }
  }

  onSubCategoryChange(subId: number | null): void {
    this.selectedSubCategoryId = subId;
    const finalId = subId || this.selectedMainCategoryId;
    this.productForm.patchValue({ category_id: finalId });
  }

  getSelectedCategoryPath(): string {
    const p = this.product();
    const finalId = this.productForm?.get('category_id')?.value || (p ? (p.categoryId || p.category_id) : null);
    if (!finalId) {
      if (p) {
        const isEn = this.currentLang() === 'en';
        if (p.categoryNameEn || p.categoryNameAr || p.category_name) {
          return isEn ? (p.categoryNameEn || p.category_name || p.categoryNameAr) : (p.categoryNameAr || p.category_name || p.categoryNameEn);
        }
      }
      return '';
    }
    const catInfo = this.getCategoryInfo(finalId);
    if (!catInfo) return '';
    return catInfo.subName ? `${catInfo.mainName} › ${catInfo.subName}` : catInfo.mainName;
  }

  getCategoryInfo(catId: number | null): { mainName: string; subName?: string } | null {
    if (!catId) return null;
    const isEn = this.currentLang() === 'en';
    const cat = this.allCategories().find(c => Number(c.id) === Number(catId));
    if (!cat) return null;

    const catName = isEn ? (cat.nameEn || cat.name_en) : (cat.nameAr || cat.name_ar || cat.nameEn);

    if (cat.parentId) {
      const parent = this.allCategories().find(c => Number(c.id) === Number(cat.parentId));
      const parentName = parent ? (isEn ? (parent.nameEn || parent.name_en) : (parent.nameAr || parent.name_ar || parent.nameEn)) : '';
      return { mainName: parentName, subName: catName };
    }
    return { mainName: catName };
  }

  getBrandName(): string {
    const p = this.product();
    if (!p) return '-';
    const isEn = this.currentLang() === 'en';
    if (p.brand) return p.brand;
    if (isEn && p.brandNameEn) return p.brandNameEn;
    if (!isEn && p.brandNameAr) return p.brandNameAr;
    const bId = p.brandId || p.brand_id;
    const found = this.brands().find(b => Number(b.id) === Number(bId));
    if (found) return isEn ? (found.nameEn || found.name_en) : (found.nameAr || found.name_ar || found.nameEn);
    return '-';
  }

  toggleEditMode(): void {
    const nextState = !this.isEditMode();
    this.isEditMode.set(nextState);
    if (nextState) {
      this.loadCategories();
      this.loadBrands();
      if (this.product()) {
        this.populateForm(this.product());
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSaveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: this.currentLang() === 'en' ? 'Missing Fields' : 'بيانات مفقودة',
        text: this.currentLang() === 'en' ? 'Please fill in all required fields.' : 'يرجى ملء جميع الحقول المطلوبة.'
      });
      return;
    }

    this.isSaving.set(true);
    const formVal = this.productForm.value;
    const formData = new FormData();

    const productPayload = {
      name_en: formVal.name_en,
      name_ar: formVal.name_ar,
      brand_id: Number(formVal.brandId),
      sku: formVal.sku || '',
      barcode: formVal.barcode || '',
      category_id: Number(formVal.category_id),
      unit: formVal.unit,
      unit_size: Number(formVal.unit_size),
      description_en: formVal.description_en || '',
      description_ar: formVal.description_ar || '',
      is_active: formVal.is_active ? 1 : 0
    };

    formData.append('product', new Blob([JSON.stringify(productPayload)], { type: 'application/json' }));
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.isEditMode.set(false);
        this.loadProductDetails();
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Product Updated' : 'تم تحديث المنتج',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500
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
    if (!this.product()) return;
    const currentActive = this.product().is_active === 1 || this.product().active === true || this.product().isActive === true;
    const newActiveState = !currentActive;

    const formData = new FormData();
    const productPayload = {
      name_en: this.product().nameEn || this.product().name_en,
      name_ar: this.product().nameAr || this.product().name_ar,
      brand_id: Number(this.product().brandId || this.product().brand_id || this.product().brand?.id),
      sku: this.product().sku || '',
      barcode: this.product().barcode || '',
      category_id: Number(this.product().categoryId || this.product().category_id),
      unit: this.product().unit || 'EACH',
      unit_size: Number(this.product().unitSize || this.product().unit_size || 1),
      description_en: this.product().descriptionEn || this.product().description_en || '',
      description_ar: this.product().descriptionAr || this.product().description_ar || '',
      is_active: newActiveState ? 1 : 0
    };

    formData.append('product', new Blob([JSON.stringify(productPayload)], { type: 'application/json' }));

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: () => {
        this.loadProductDetails();
        Swal.fire({
          icon: 'success',
          title: newActiveState ? (this.currentLang() === 'en' ? 'Product Activated' : 'تم تفعيل المنتج') : (this.currentLang() === 'en' ? 'Product Deactivated' : 'تم إلغاء تفعيل المنتج'),
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err) => console.error('Failed to toggle status:', err)
    });
  }

  deleteProduct(): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Product?' : 'حذف المنتج؟',
      text: this.currentLang() === 'en' ? 'This action cannot be undone.' : 'لا يمكن التراجع عن هذا الإجراء.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete' : 'نعم، احذف',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProduct(this.productId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted Successfully' : 'تم الحذف بنجاح',
              timer: 1500,
              showConfirmButton: false
            }).then(() => {
              this.router.navigate(['/admin/products']);
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
