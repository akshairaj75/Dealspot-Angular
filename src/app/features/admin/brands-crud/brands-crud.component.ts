import { Component, ElementRef, HostListener, inject, OnInit, signal, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrandService } from '../../../core/services/brand.service';
import { CategoryService } from '../../../core/services/category.service';
import { TranslationService } from '../../../core/services/translation.service';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-brands-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './brands-crud.component.html',
  styleUrl: './brands-crud.component.css'
})
export class BrandsCrudComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  // Brands list & paged state
  brands = signal<any[]>([]);
  allBrands = signal<any[]>([]); // used for stats counts
  loading = signal<boolean>(true);
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
  activeFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE' | 'FEATURED'>('ALL');

  // Categories
  categories = signal<any[]>([]);
  categorySearch = '';
  isCategoryDropdownOpen = false;

  // Form & Modal state
  brandForm!: FormGroup;
  isModalOpen = false;
  editingBrandId: number | null = null;
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

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
    this.loadStatsBrands();
    this.loadCategories();
    this.resetAndLoadBrands();

    this.searchSub = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.resetAndLoadBrands();
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

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        if (!this.loading() && !this.loadingMore() && this.hasMore()) {
          this.loadNextPage();
        }
      }
    }, { rootMargin: '250px' });

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

  loadStatsBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.allBrands.set(res || []);
      },
      error: (err) => console.error('Failed to load stats brands:', err)
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (res: any[]) => this.categories.set(res || []),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  setFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FEATURED'): void {
    this.activeFilter.set(filter);
    this.resetAndLoadBrands();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.resetAndLoadBrands();
  }

  resetAndLoadBrands(): void {
    this.currentPage.set(0);
    this.loading.set(true);
    this.loadingMore.set(false);

    const isFeatured = this.activeFilter() === 'FEATURED' ? true : undefined;

    this.brandService.searchBrands(this.searchQuery, 0, this.pageSize, isFeatured).subscribe({
      next: (res: any) => {
        const items = res?.content || (Array.isArray(res) ? res : []);
        const filtered = this.applyLocalStatusFilter(items);
        this.brands.set(filtered);
        this.totalElements.set(res?.totalElements || filtered.length);
        this.totalPages.set(res?.totalPages || 1);
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loading.set(false);
        this.cd.detectChanges();
        this.reobserveSentinel();
      },
      error: (err) => {
        console.error('Failed to load paged brands:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  loadNextPage(): void {
    if (this.loadingMore() || !this.hasMore()) return;

    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);

    const isFeatured = this.activeFilter() === 'FEATURED' ? true : undefined;

    this.brandService.searchBrands(this.searchQuery, nextPage, this.pageSize, isFeatured).subscribe({
      next: (res: any) => {
        const newItems = res?.content || [];
        const filtered = this.applyLocalStatusFilter(newItems);
        this.brands.update(prev => [...prev, ...filtered]);
        this.currentPage.set(res?.number ?? nextPage);
        this.totalElements.set(res?.totalElements || this.totalElements());
        this.totalPages.set(res?.totalPages || this.totalPages());
        this.hasMore.set((res?.number + 1) < (res?.totalPages || 0));
        this.loadingMore.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load next page of brands:', err);
        this.loadingMore.set(false);
        this.cd.detectChanges();
      }
    });
  }

  private applyLocalStatusFilter(items: any[]): any[] {
    if (this.activeFilter() === 'ACTIVE') {
      return items.filter(b => b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true);
    } else if (this.activeFilter() === 'INACTIVE') {
      return items.filter(b => !(b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true));
    }
    return items;
  }

  getActiveCount(): number {
    const list = this.allBrands().length > 0 ? this.allBrands() : this.brands();
    return list.filter(b => b.active === 1 || b.active === true || b.isActive === 1 || b.isActive === true).length;
  }

  getInactiveCount(): number {
    const list = this.allBrands().length > 0 ? this.allBrands() : this.brands();
    return list.length - this.getActiveCount();
  }

  getFeaturedCount(): number {
    const list = this.allBrands().length > 0 ? this.allBrands() : this.brands();
    return list.filter(b => b.featured === true || b.isFeatured === true).length;
  }

  getLogoUrl(url: string | null | undefined): string {
    if (!url) return 'https://placehold.co/100x100?text=No+Logo';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  // --- Category Multi-Select Helpers ---
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  closeCategoryDropdown(): void {
    this.isCategoryDropdownOpen = false;
  }

  getFilteredCategories(): any[] {
    const search = this.categorySearch.toLowerCase().trim();
    if (!search) return this.categories();
    return this.categories().filter(c => 
      (c.nameEn && c.nameEn.toLowerCase().includes(search)) ||
      (c.nameAr && c.nameAr.toLowerCase().includes(search))
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

  removeCategory(catId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.toggleCategory(catId);
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

  // --- Modal Helpers ---
  openAddModal(): void {
    this.editingBrandId = null;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    this.categorySearch = '';
    this.isCategoryDropdownOpen = false;
    this.brandForm.reset({
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      websiteUrl: '',
      categoryIds: [],
      isFeatured: false,
      isActive: true
    });
    this.isModalOpen = true;
  }

  openEditModal(brand: any): void {
    this.editingBrandId = brand.id;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = brand.logoUrl ? this.getLogoUrl(brand.logoUrl) : null;
    this.categorySearch = '';
    this.isCategoryDropdownOpen = false;

    const catIds = (brand.categories || []).map((c: any) => c.id);

    this.brandForm.reset({
      nameEn: brand.nameEn || brand.name_en || '',
      nameAr: brand.nameAr || brand.name_ar || '',
      descriptionEn: brand.descriptionEn || brand.description_en || '',
      descriptionAr: brand.descriptionAr || brand.description_ar || '',
      websiteUrl: brand.websiteUrl || brand.website_url || '',
      categoryIds: catIds,
      isFeatured: brand.featured === true || brand.isFeatured === true,
      isActive: brand.active === 1 || brand.active === true || brand.isActive === 1 || brand.isActive === true
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedLogoFile = null;
    this.logoPreviewUrl = null;
    this.isCategoryDropdownOpen = false;
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
        this.resetAndLoadBrands();
        this.loadStatsBrands();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save brand.' : 'فشل حفظ العلامة التجارية.')
        });
      }
    });
  }

  deleteBrand(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' ? 'Do you want to delete this brand?' : 'هل تريد حذف هذه العلامة التجارية؟',
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
            this.resetAndLoadBrands();
            this.loadStatsBrands();
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
