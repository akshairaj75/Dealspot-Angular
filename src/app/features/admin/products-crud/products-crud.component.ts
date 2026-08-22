import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { BrandService } from '../../../core/services/brand.service';
import { TranslationService } from '../../../core/services/translation.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-products-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './products-crud.component.html',
  styleUrls: ['./products-crud.component.css']
})
export class ProductsCrudComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private brandService = inject(BrandService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  // Products state
  products = signal<any[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  currentPage = signal<number>(0);
  pageSize = 20;
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  hasMore = signal<boolean>(false);

  // Search & Filter state
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  filterCategoryId = signal<number | null>(null);
  filterBrandId = signal<number | null>(null);

  // Categories & Brands
  allCategories = signal<any[]>([]);
  mainCategories = signal<any[]>([]);
  availableSubcategories = signal<any[]>([]);
  brands = signal<any[]>([]);

  // Category selection in modal
  selectedMainCategoryId: number | null = null;
  selectedSubCategoryId: number | null = null;

  // Modal state
  productForm!: FormGroup;
  isModalOpen = false;
  editingProductId: number | null = null;
  previewUrl: string | null = null;

  // Scroll to top
  showScrollTop = signal<boolean>(false);
  private observer?: IntersectionObserver;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const yOffset = window.pageYOffset || document.documentElement.scrollTop;
    this.showScrollTop.set(yOffset > 400);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.initForm();
    this.fetchBrands();
    this.loadCategories();
    this.resetAndLoadProducts();

    this.searchSub = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.resetAndLoadProducts();
    });
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.observer?.disconnect();
  }

  initForm(): void {
    this.productForm = this.fb.group({
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      brandId: [null, Validators.required],
      sku: ['', Validators.required],
      barcode: ['', Validators.required],
      category_id: ['', Validators.required],
      unit: ['EACH', Validators.required],
      unit_size: [1, Validators.required],
      description_en: [''],
      description_ar: [''],
      is_active: [true],
      image: [null]
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (res: any[]) => {
        this.allCategories.set(res || []);
        const mains = (res || []).filter((c: any) => c.parentId === null || c.parentId === undefined);
        this.mainCategories.set(mains);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        if (!this.loading() && !this.loadingMore() && this.hasMore()) {
          this.loadNextPage();
        }
      }
    }, {
      rootMargin: '250px'
    });

    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  private reobserveSentinel(): void {
    setTimeout(() => {
      if (this.observer && this.scrollSentinel?.nativeElement) {
        this.observer.disconnect();
        this.observer.observe(this.scrollSentinel.nativeElement);
      }
    }, 100);
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onFilterCategoryChange(catId: any): void {
    this.filterCategoryId.set(catId ? Number(catId) : null);
    this.resetAndLoadProducts();
  }

  onFilterBrandChange(brandId: any): void {
    this.filterBrandId.set(brandId ? Number(brandId) : null);
    this.resetAndLoadProducts();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.filterCategoryId.set(null);
    this.filterBrandId.set(null);
    this.resetAndLoadProducts();
  }

  resetAndLoadProducts(): void {
    this.currentPage.set(0);
    this.loading.set(true);
    this.loadingMore.set(false);

    this.productService.getPagedProducts(
      0,
      this.pageSize,
      this.searchQuery,
      this.filterCategoryId(),
      this.filterBrandId(),
      'createdAt',
      'desc'
    ).subscribe({
      next: (res) => {
        const items = res?.content || [];
        this.products.set(items);
        this.totalElements.set(res?.totalElements || 0);
        this.totalPages.set(res?.totalPages || 0);
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loading.set(false);
        this.cd.detectChanges();
        this.reobserveSentinel();
      },
      error: (err) => {
        console.error('Failed to load paged products:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  loadNextPage(): void {
    if (this.loadingMore() || !this.hasMore()) return;

    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);

    this.productService.getPagedProducts(
      nextPage,
      this.pageSize,
      this.searchQuery,
      this.filterCategoryId(),
      this.filterBrandId(),
      'createdAt',
      'desc'
    ).subscribe({
      next: (res) => {
        const newItems = res?.content || [];
        this.products.update(prev => [...prev, ...newItems]);
        this.currentPage.set(res?.number ?? nextPage);
        this.totalElements.set(res?.totalElements || this.totalElements());
        this.totalPages.set(res?.totalPages || this.totalPages());
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loadingMore.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load next page of products:', err);
        this.loadingMore.set(false);
        this.cd.detectChanges();
      }
    });
  }

  fetchBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.brands.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load brands:', err)
    });
  }

  openAddModal(): void {
    this.editingProductId = null;
    this.previewUrl = null;
    this.selectedMainCategoryId = null;
    this.selectedSubCategoryId = null;
    this.availableSubcategories.set([]);

    this.productForm.reset({
      is_active: true,
      unit: 'EACH',
      unit_size: 1,
      image: null,
      brandId: null,
      category_id: ''
    });
    this.isModalOpen = true;
  }

  openEditModal(p: any): void {
    this.editingProductId = p.id;
    const catId = p.categoryId || p.category_id;

    // Resolve Main category and Subcategory from the flat category list
    const matchedCat = this.allCategories().find((c: any) => c.id === catId);
    if (matchedCat) {
      if (matchedCat.parentId != null) {
        // It's a subcategory
        this.selectedMainCategoryId = matchedCat.parentId;
        const subs = this.allCategories().filter((c: any) => c.parentId === matchedCat.parentId);
        this.availableSubcategories.set(subs);
        this.selectedSubCategoryId = matchedCat.id;
      } else {
        // It's a top-level category
        this.selectedMainCategoryId = matchedCat.id;
        const subs = this.allCategories().filter((c: any) => c.parentId === matchedCat.id);
        this.availableSubcategories.set(subs);
        this.selectedSubCategoryId = null;
      }
    } else {
      this.selectedMainCategoryId = null;
      this.selectedSubCategoryId = null;
      this.availableSubcategories.set([]);
    }

    this.productForm.patchValue({
      name_en: p.nameEn || p.name_en || '',
      name_ar: p.nameAr || p.name_ar || '',
      brandId: p.brandId ?? (p.brand ? p.brand.id : null),
      sku: p.sku || '',
      barcode: p.barcode || '',
      category_id: catId || '',
      unit: p.unit || 'EACH',
      unit_size: p.unitSize || p.unit_size || 1,
      description_en: p.descriptionEn || p.description_en || '',
      description_ar: p.descriptionAr || p.description_ar || '',
      is_active: p.is_active === 1 || p.isActive === 1 || p.is_active === true || p.isActive === true || p.active === true || p.active === 1
    });

    if (p.images && p.images.length > 0) {
      this.previewUrl = this.filePath + p.images[0].imageUrl;
    } else if (p.primaryImageUrl || p.primary_image_url) {
      this.previewUrl = this.filePath + (p.primaryImageUrl || p.primary_image_url);
    } else {
      this.previewUrl = null;
    }

    this.isModalOpen = true;
  }

  onMainCategoryChange(mainId: number | null): void {
    this.selectedMainCategoryId = mainId ? Number(mainId) : null;
    this.selectedSubCategoryId = null;

    if (this.selectedMainCategoryId) {
      const subs = this.allCategories().filter((c: any) => c.parentId === this.selectedMainCategoryId);
      this.availableSubcategories.set(subs);
      // Default category to the selected main category
      this.productForm.patchValue({ category_id: this.selectedMainCategoryId });
    } else {
      this.availableSubcategories.set([]);
      this.productForm.patchValue({ category_id: '' });
    }
  }

  onSubCategoryChange(subId: number | null): void {
    this.selectedSubCategoryId = subId ? Number(subId) : null;

    if (this.selectedSubCategoryId) {
      this.productForm.patchValue({ category_id: this.selectedSubCategoryId });
    } else if (this.selectedMainCategoryId) {
      // Fall back to main category if subcategory is unselected
      this.productForm.patchValue({ category_id: this.selectedMainCategoryId });
    } else {
      this.productForm.patchValue({ category_id: '' });
    }
  }

  getSelectedCategoryPath(): string {
    if (!this.selectedMainCategoryId) return '';
    const main = this.allCategories().find(c => c.id === this.selectedMainCategoryId);
    const mainName = this.currentLang() === 'en' ? main?.nameEn : (main?.nameAr || main?.nameEn);

    if (this.selectedSubCategoryId) {
      const sub = this.allCategories().find(c => c.id === this.selectedSubCategoryId);
      const subName = this.currentLang() === 'en' ? sub?.nameEn : (sub?.nameAr || sub?.nameEn);
      return `${mainName} ➔ ${subName}`;
    }
    return mainName || '';
  }

  getCategoryDisplayName(categoryId: number): string {
    if (!categoryId) return '-';
    const cat = this.allCategories().find(c => c.id === categoryId);
    if (!cat) return `#${categoryId}`;

    const catName = this.currentLang() === 'en' ? cat.nameEn : (cat.nameAr || cat.nameEn);
    if (cat.parentId) {
      const parent = this.allCategories().find(c => c.id === cat.parentId);
      const parentName = this.currentLang() === 'en' ? parent?.nameEn : (parent?.nameAr || parent?.nameEn);
      return `${parentName} ➔ ${catName}`;
    }
    return catName;
  }

  getCategoryInfo(categoryId: number): { mainName: string; subName: string | null } {
    if (!categoryId) return { mainName: '-', subName: null };
    const cat = this.allCategories().find(c => c.id === categoryId);
    if (!cat) return { mainName: `#${categoryId}`, subName: null };

    const catName = this.currentLang() === 'en' ? cat.nameEn : (cat.nameAr || cat.nameEn);
    if (cat.parentId) {
      const parent = this.allCategories().find(c => c.id === cat.parentId);
      const parentName = this.currentLang() === 'en' ? parent?.nameEn : (parent?.nameAr || parent?.nameEn);
      return { mainName: parentName || '', subName: catName || '' };
    }
    return { mainName: catName || '', subName: null };
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.previewUrl = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.productForm.patchValue({ image: file });
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const val = this.productForm.value;
    const selectedBrand = this.brands().find((b: any) => b.id === Number(val.brandId));
    const product: any = {
      nameEn: val.name_en,
      nameAr: val.name_ar,
      brandId: Number(val.brandId),
      brand: selectedBrand ? selectedBrand.nameEn : '',
      brandAr: selectedBrand ? selectedBrand.nameAr : '',
      sku: val.sku,
      barcode: val.barcode,
      categoryId: Number(val.category_id),
      unit: val.unit,
      unitSize: Number(val.unit_size),
      descriptionEn: val.description_en || '',
      descriptionAr: val.description_ar || '',
      active: val.is_active ? 1 : 0
    };

    if (this.editingProductId) {
      product.id = this.editingProductId;
    }

    const formData = new FormData();
    formData.append(
      'data',
      new Blob([JSON.stringify(product)], {
        type: 'application/json'
      })
    );

    if (val.image) {
      formData.append('file', val.image);
    }

    const request = this.editingProductId
      ? this.productService.updateProduct(this.editingProductId, formData)
      : this.productService.addProduct(formData);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingProductId ? 'Updated!' : 'Added!') : (this.editingProductId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingProductId ? 'Product updated successfully.' : 'Product added successfully.')
            : (this.editingProductId ? 'تم تحديث المنتج بنجاح.' : 'تم إضافة المنتج بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.resetAndLoadProducts();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: this.editingProductId
            ? (this.currentLang() === 'en' ? 'Failed to update product.' : 'فشل تحديث المنتج.')
            : (this.currentLang() === 'en' ? 'Failed to add product.' : 'فشل إضافة المنتج.')
        });
      }
    });
  }

  deleteProduct(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en'
        ? 'All active offers linking to this item will lose their product specifications.'
        : 'جميع العروض المرتبطة بهذا المنتج ستفقد بياناته.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProduct(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Product has been deleted.' : 'تم حذف المنتج بنجاح.',
              'success'
            );
            this.resetAndLoadProducts();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete product.' : 'فشل حذف المنتج.',
              'error'
            );
          }
        });
      }
    });
  }
}
export { TranslationService } from '../../../core/services/translation.service';
