import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { ProductService } from '../../../core/services/product.service';
import { BrandService } from '../../../core/services/brand.service';
import { TranslationService } from '../../../core/services/translation.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-products-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './products-crud.component.html',
  styleUrls: ['./products-crud.component.css']
})
export class ProductsCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private brandService = inject(BrandService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  products = signal<any[]>([]);
  allCategories = signal<any[]>([]);
  mainCategories = signal<any[]>([]);
  availableSubcategories = signal<any[]>([]);
  filteredProducts = signal<any[]>([]);
  searchQuery = '';

  selectedMainCategoryId: number | null = null;
  selectedSubCategoryId: number | null = null;

  productForm!: FormGroup;
  isModalOpen = false;
  editingProductId: number | null = null;
  previewUrl: string | null = null;
  brands: any[] = [];

  ngOnInit(): void {
    this.loadProducts();
    this.fetchBrands();
    this.loadCategories();
    this.initForm();
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

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (res) => {
        this.products.set(res || []);
        this.applyFilter();
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load products:', err)
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredProducts.set(this.products());
      return;
    }

    const filtered = this.products().filter(p =>
      (p.nameEn && p.nameEn.toLowerCase().includes(query)) ||
      (p.name_en && p.name_en.toLowerCase().includes(query)) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(query)) ||
      (p.name_ar && p.name_ar.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.brandAr && p.brandAr.toLowerCase().includes(query)) ||
      (p.brand_ar && p.brand_ar.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.id && p.id.toString().includes(query))
    );
    this.filteredProducts.set(filtered);
  }

  fetchBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.brands = res || [];
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
      brandId: p.brandId ?? null,
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
    const selectedBrand = this.brands.find((b: any) => b.id === Number(val.brandId));
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
        this.loadProducts();
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
            this.loadProducts();
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
