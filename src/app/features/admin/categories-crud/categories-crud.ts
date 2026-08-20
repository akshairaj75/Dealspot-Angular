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

  // Drag and Drop state
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;
  dragTab: 'parent' | 'sub' | null = null;
  isSavingOrder = false;

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
      this.categories = res || [];

      // Parent categories (parentId is null) sorted by sortOrder
      this.parentCategories = this.categories
        .filter((c: any) => c.parentId === null)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      // Subcategories (parentId is not null) sorted by sortOrder
      this.subCategories = this.categories
        .filter((c: any) => c.parentId !== null)
        .map((sub: any) => {
          const parent = this.parentCategories.find(p => p.id === sub.parentId);
          return {
            ...sub,
            parentNameEn: parent ? parent.nameEn : 'Unknown'
          };
        })
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      this.cd.detectChanges();
    });
  }

  onDragStart(event: DragEvent, index: number, tab: 'parent' | 'sub'): void {
    this.draggedIndex = index;
    this.dragTab = tab;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverIndex = index;
  }

  onDragEnd(): void {
    this.draggedIndex = null;
    this.dragOverIndex = null;
    this.dragTab = null;
  }

  onDrop(event: DragEvent, targetIndex: number, tab: 'parent' | 'sub'): void {
    event.preventDefault();
    if (this.draggedIndex === null || this.draggedIndex === targetIndex || this.dragTab !== tab) {
      this.onDragEnd();
      return;
    }

    const list = tab === 'parent' ? [...this.parentCategories] : [...this.getFilteredSubCategories()];
    const [movedItem] = list.splice(this.draggedIndex, 1);
    list.splice(targetIndex, 0, movedItem);

    // Update sortOrder values locally
    list.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });

    if (tab === 'parent') {
      this.parentCategories = list;
    } else {
      if (this.selectedParentFilter) {
        const filterId = Number(this.selectedParentFilter);
        let currentSubIndex = 0;
        this.subCategories = this.subCategories.map(sub => {
          if (sub.parentId === filterId) {
            const updated = list[currentSubIndex++];
            return updated || sub;
          }
          return sub;
        });
      } else {
        this.subCategories = list;
      }
    }

    this.onDragEnd();
    this.saveOrder(list);
  }

  moveUp(index: number, tab: 'parent' | 'sub'): void {
    if (index <= 0) return;
    this.draggedIndex = index;
    this.dragTab = tab;
    this.onDrop(new DragEvent('drop'), index - 1, tab);
  }

  moveDown(index: number, tab: 'parent' | 'sub'): void {
    const list = tab === 'parent' ? this.parentCategories : this.getFilteredSubCategories();
    if (index >= list.length - 1) return;
    this.draggedIndex = index;
    this.dragTab = tab;
    this.onDrop(new DragEvent('drop'), index + 1, tab);
  }

  private saveOrder(items: any[]): void {
    const payload = items.map((item, idx) => ({
      id: item.id,
      sortOrder: idx + 1
    }));

    this.isSavingOrder = true;
    this.cd.detectChanges();

    this.categoryService.reorderCategories(payload).subscribe({
      next: () => {
        this.isSavingOrder = false;
        this.cd.detectChanges();

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800,
          timerProgressBar: true,
        });
        Toast.fire({
          icon: 'success',
          title: 'Categories order updated!'
        });
      },
      error: (err) => {
        console.error('Failed to save category order:', err);
        this.isSavingOrder = false;
        this.cd.detectChanges();
        Swal.fire('Error', 'Failed to update category order', 'error');
      }
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
    this.catForm.reset({
      nameEn: '',
      nameAr: '',
      iconSlug: 'folder',
      parentId: null,
      sortOrder: 1,
      isActive: true,
      image: null
    });
    this.isModalOpen = true;
  }

  openEditModal(cat: any): void {
    this.editingCategoryId = cat.id;
    const isActive = cat.active !== undefined
      ? !!cat.active
      : (cat.is_active === 1 || cat.isActive === 1 || cat.is_active === true || cat.isActive === true);

    this.catForm.reset({
      nameEn: cat.nameEn || '',
      nameAr: cat.nameAr || '',
      iconSlug: cat.iconSlug || 'folder',
      parentId: cat.parentId ?? null,
      sortOrder: cat.sortOrder ?? 1,
      isActive: isActive,
      image: null
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
        cat.nameEn?.toLowerCase().trim() === formValue.nameEn?.toLowerCase().trim() ||
        cat.nameAr?.toLowerCase().trim() === formValue.nameAr?.toLowerCase().trim()
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
      active: !!formValue.isActive,
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
          text: error?.error?.message || 'Something went wrong. Please try again.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteCategory(id: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this category?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoryService.deleteCategory(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Category deleted successfully.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadCategories();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', err?.error?.message || 'Failed to delete category.', 'error');
          }
        });
      }
    });
  }
}
export { TranslationService } from '../../../core/services/translation.service';