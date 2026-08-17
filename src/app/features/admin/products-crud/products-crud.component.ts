import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
// import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { ProductService } from '../../../core/services/product.service';
// import { AdminService } from '../../../core/services/admin.service';
// import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
// import { Product, Category } from '../../../core/models';

import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';
import { BrandService } from '../../../core/services/brand.service';

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
  filePath = environment.filePath;

  constructor(private productService: ProductService,
    private brandService: BrandService,
    private cd:ChangeDetectorRef 
  ) { }

  products = signal<any[]>([]);
  categories = signal<any[]>([]);
  filteredProducts = signal<any[]>([]);
  searchQuery = '';

  productForm!: FormGroup;
  isModalOpen = false;
  editingProductId: number | null = null;
  previewUrl: string | null = null;
  brands: any = []

  ngOnInit(): void {
    this.loadProducts();
    this.fetchBrands();
    this.categoryService.getCategories().subscribe(res => this.categories.set(res));

    this.productForm = this.fb.group({
      name_en: ['', Validators.required],
      name_ar: ['', Validators.required],
      brandId: [null, Validators.required],
      sku: ['', Validators.required],
      barcode: ['', Validators.required],
      category_id: ['', Validators.required],
      unit: ['pcs', Validators.required],
      unit_size: [1, Validators.required],
      description_en: [''],
      description_ar: [''],
      is_active: [true],
      image: [null]
    });
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(res => {
      this.products.set(res);
      this.applyFilter();
      console.log(this.products());
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

  openAddModal(): void {
    this.editingProductId = null;
    this.previewUrl = null;
    this.productForm.reset({ is_active: true, unit: 'pcs', unit_size: 1, image: null, brandId: null });
    this.isModalOpen = true;
  }

  openEditModal(p: any): void {
    console.log("p",p);
    this.editingProductId = p.id;
    this.productForm.patchValue({
      
      name_en: p.nameEn,
      name_ar: p.nameAr,
      brandId: p.brandId,
      sku: p.sku,
      barcode: p.barcode,
      category_id: p.categoryId || p.category_id,
      unit: p.unit,
      unit_size: p.unitSize || p.unit_size,
      description_en: p.descriptionEn || p.description_en || '',
      description_ar: p.descriptionAr || p.description_ar || '',
      is_active: p.is_active === 1 || p.isActive === 1 || p.is_active === true || p.isActive === true
    });

    if (p.images && p.images.length > 0) {
      this.previewUrl = this.filePath + p.images[0].imageUrl;
    } else {
      this.previewUrl = null;
    }

    this.isModalOpen = true;
  }
  fetchBrands() {
    this.brandService.getBrands().subscribe({
      next: (res: any[]) => {
        this.brands = res
        console.log(this.brands)
      }
    })
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
    console.log("pr",product)

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
  ? this.productService.updateProduct(this.editingProductId!, formData)
  : this.productService.addProduct(formData);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.editingProductId ? 'Updated!' : 'Added!',
          text: this.editingProductId ? 'Product updated successfully.' : 'Product added successfully.',
          timer: 2000,
          showConfirmButton: false
        });
        this.cd.detectChanges()
        this.loadProducts();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.editingProductId ? 'Failed to update product.' : 'Failed to add product.'
        });
      }
    });
  }

  deleteProduct(id: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'All active offers linking to this item will lose their product specifications.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProduct(id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Product has been deleted.', 'success');
            this.loadProducts();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Failed to delete product.', 'error');
          }
        });
      }
    });
  }
}
export { TranslationService } from '../../../core/services/translation.service';
