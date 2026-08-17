import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-categories-crud',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './categories-crud.html',
  styleUrl: './categories-crud.css',
})
export class CategoriesCrud implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  // private adminService = inject(AdminService);

  constructor(
    private cd: ChangeDetectorRef
  ) {

  }

  categories: any[] = [];
  catForm!: FormGroup;
  isModalOpen = false;
  editingCategoryId: number | null = null;
  filePath = environment.filePath;
  
  // Tab state
  activeTab: 'parent' | 'sub' = 'parent';
  
  // Filter for subcategories
  selectedParentFilter: string = '';

  ngOnInit(): void {
    this.loadCategories();
    this.catForm = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      iconSlug: ['folder', Validators.required],
      parentId: [null],
      sortOrder: [1, Validators.required],
      isActive: [true],
      image: [null]
    });
  }
  parentCategories: any[] = [];
  subCategories: any[] = [];

  loadCategories(): void {
    this.categoryService.getCategories().subscribe(res => {
      this.categories = res;
      console.log(res);

      // Parent categories (parentId is null)
      this.parentCategories = res.filter((c: any) => c.parentId === null);

      // Subcategories (parentId is not null) - map parentNameEn dynamically
      this.subCategories = res.filter((c: any) => c.parentId !== null).map((sub: any) => {
        const parent = this.parentCategories.find(p => p.id === sub.parentId);
        return {
          ...sub,
          parentNameEn: parent ? parent.nameEn : 'Unknown'
        };
      });

      this.cd.detectChanges();
    });
  }

  getFilteredSubCategories() {
    if (!this.selectedParentFilter) {
      return this.subCategories;
    }
    const filterId = Number(this.selectedParentFilter);
    return this.subCategories.filter(sub => sub.parentId === filterId);
  }

  openAddModal(): void {
    this.editingCategoryId = null;
    this.catForm.reset({ isActive: true, sortOrder: 1, iconSlug: 'folder', parentId: null });
    this.isModalOpen = true;
  }

  openEditModal(cat: any): void {
    this.editingCategoryId = cat.id;
    this.catForm.patchValue({
      nameEn: cat.nameEn,
      nameAr: cat.nameAr,
      iconSlug: cat.iconSlug,
      parentId: cat.parentId || null,
      sortOrder: cat.sortOrder,
      isActive: cat.is_active === 1 || cat.isActive === 1 || cat.is_active === true || cat.isActive === true
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.catForm.patchValue({ image: file });
    }
  }

  onSubmit(): void {
  if (this.catForm.invalid) {
    this.catForm.markAllAsTouched();
    return;
  }

  const formValue = this.catForm.value;

  // Duplicate check
  const isDuplicate = this.categories.some((cat: any) => {
    if (this.editingCategoryId && cat.id === this.editingCategoryId) {
      return false;
    }

    return (
      cat.nameEn?.toLowerCase().trim() === formValue.nameEn.toLowerCase().trim() ||
      cat.nameAr?.toLowerCase().trim() === formValue.nameAr.toLowerCase().trim()
    );
  });

  if (isDuplicate) {
    Swal.fire({
      icon: 'warning',
      title: 'Duplicate Category',
      text: 'A category with this English or Arabic name already exists!',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  const category = {
    nameEn: formValue.nameEn,
    nameAr: formValue.nameAr,
    iconSlug: formValue.iconSlug,
    sortOrder: formValue.sortOrder,
    active: formValue.isActive ? 1 : 0,
    parentId: formValue.parentId ? Number(formValue.parentId) : null
  };

  const formData = new FormData();

  // Send JSON as "data"
  formData.append(
    'data',
    new Blob([JSON.stringify(category)], {
      type: 'application/json'
    })
  );

  // Send image separately as "file"
  if (formValue.image) {
    formData.append('file', formValue.image);
  }

  const request = this.editingCategoryId
    ? this.categoryService.updateCategory(this.editingCategoryId, formData)
    : this.categoryService.createCategory(formData);

  request.subscribe({
    next: () => {
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: this.editingCategoryId
          ? 'Category updated successfully.'
          : 'Category created successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      this.loadCategories();
      this.closeModal();
    },
    error: (error) => {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: this.editingCategoryId ? 'Update Failed' : 'Creation Failed',
        text: 'Something went wrong. Please try again.',
        confirmButtonColor: '#d33'
      });
    }
  });
}

  deleteCategory(id: number): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.categoryService.deleteCategory(id).subscribe(() => {
        // this.adminService.logAction('category', id, 'DELETE', 1);
        this.loadCategories();
      });
    }
  }
}
export { TranslationService } from '../../../core/services/translation.service';