import { ChangeDetectorRef, Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../../core/services/category.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-categories-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './categories-crud.html',
  styleUrl: './categories-crud.css',
})
export class CategoriesCrud implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  categories: any[] = [];
  catForm!: FormGroup;
  isModalOpen = false;
  editingCategoryId: number | null = null;
  filePath = environment.filePath;
  imagePreviewUrl: string | null = null;

  // Tab state
  activeTab: 'parent' | 'sub' = 'parent';

  // View mode & search
  viewMode = signal<'GRID' | 'TABLE'>('GRID');
  searchQuery = '';
  openMenuId = signal<number | null>(null);

  // Filter for subcategories
  selectedParentFilter: string = '';

  // Drag and Drop state
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;
  dragTab: 'parent' | 'sub' | null = null;
  isSavingOrder = false;

  parentCategories: any[] = [];
  subCategories: any[] = [];

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openMenuId() !== null) {
      this.openMenuId.set(null);
    }
  }

  toggleCatMenu(id: number, event: Event): void {
    event.stopPropagation();
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(id);
    }
  }

  closeCatMenu(): void {
    this.openMenuId.set(null);
  }

  setViewMode(mode: 'GRID' | 'TABLE'): void {
    this.viewMode.set(mode);
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

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

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (res) => {
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
              parentNameEn: parent ? parent.nameEn : 'Unknown',
              parentNameAr: parent ? parent.nameAr : ''
            };
          })
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading categories:', err);
      }
    });
  }

  getFilteredParentCategories(): any[] {
    let list = this.parentCategories;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.nameEn || '').toLowerCase().includes(q) ||
        (c.nameAr || '').toLowerCase().includes(q) ||
        (c.iconSlug || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  getFilteredSubCategories(): any[] {
    let list = this.subCategories;
    if (this.selectedParentFilter) {
      const filterId = Number(this.selectedParentFilter);
      list = list.filter(sub => sub.parentId === filterId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.nameEn || '').toLowerCase().includes(q) ||
        (c.nameAr || '').toLowerCase().includes(q) ||
        (c.parentNameEn || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  onTouchStart(event: TouchEvent, index: number, tab: 'parent' | 'sub'): void {
    this.draggedIndex = index;
    this.dragTab = tab;
    this.dragOverIndex = index;
  }

  onTouchMove(event: TouchEvent, tab: 'parent' | 'sub'): void {
    if (this.draggedIndex === null || this.dragTab !== tab) return;

    const touch = event.touches[0];
    if (!touch) return;

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const itemElement = target.closest('.mobile-cat-item') as HTMLElement;
    if (itemElement && itemElement.dataset['index'] !== undefined) {
      const targetIdx = Number(itemElement.dataset['index']);
      if (!isNaN(targetIdx) && targetIdx !== this.dragOverIndex) {
        this.dragOverIndex = targetIdx;
        this.cd.detectChanges();
      }
    }
  }

  onTouchEnd(event: TouchEvent, tab: 'parent' | 'sub'): void {
    if (this.draggedIndex !== null && this.dragOverIndex !== null && this.dragTab === tab) {
      if (this.draggedIndex !== this.dragOverIndex) {
        this.onDrop(new DragEvent('drop'), this.dragOverIndex, tab);
        return;
      }
    }
    this.onDragEnd();
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

  moveUp(index: number, tab: 'parent' | 'sub', event?: Event): void {
    if (event) event.stopPropagation();
    if (index <= 0) return;
    this.draggedIndex = index;
    this.dragTab = tab;
    this.onDrop(new DragEvent('drop'), index - 1, tab);
  }

  moveDown(index: number, tab: 'parent' | 'sub', event?: Event): void {
    if (event) event.stopPropagation();
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
          title: this.currentLang() === 'en' ? 'Category order saved!' : 'تم حفظ ترتيب الفئات بنجاح!'
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

  openAddModal(): void {
    this.editingCategoryId = null;
    this.imagePreviewUrl = null;
    this.catForm.reset({
      nameEn: '',
      nameAr: '',
      iconSlug: 'folder',
      parentId: this.activeTab === 'sub' && this.selectedParentFilter ? Number(this.selectedParentFilter) : (this.activeTab === 'sub' && this.parentCategories.length > 0 ? this.parentCategories[0].id : null),
      sortOrder: this.activeTab === 'parent' ? this.parentCategories.length + 1 : this.subCategories.length + 1,
      isActive: true,
      image: null
    });
    this.isModalOpen = true;
  }

  openEditModal(cat: any): void {
    this.editingCategoryId = cat.id;
    this.imagePreviewUrl = cat.imageUrl ? (this.filePath + cat.imageUrl) : null;
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
    this.imagePreviewUrl = null;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.catForm.patchValue({ image: file });
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cd.detectChanges();
      };
      reader.readAsDataURL(file);
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
        title: this.currentLang() === 'en' ? 'Duplicate Category' : 'فئة مكررة',
        text: this.currentLang() === 'en'
          ? 'A category with this English or Arabic name already exists!'
          : 'توجد فئة بهذا الاسم العربي أو الإنجليزي مسبقاً!',
        confirmButtonColor: '#10b981'
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
          title: this.currentLang() === 'en' ? 'Success!' : 'تم بنجاح!',
          text: this.editingCategoryId
            ? (this.currentLang() === 'en' ? 'Category updated successfully.' : 'تم تعديل الفئة بنجاح.')
            : (this.currentLang() === 'en' ? 'Category created successfully.' : 'تم إنشاء الفئة بنجاح.'),
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
          title: this.editingCategoryId
            ? (this.currentLang() === 'en' ? 'Update Failed' : 'فشل التعديل')
            : (this.currentLang() === 'en' ? 'Creation Failed' : 'فشل الإنشاء'),
          text: error?.error?.message || (this.currentLang() === 'en' ? 'Something went wrong. Please try again.' : 'حدث خطأ ما. يرجى المحاولة لاحقاً.'),
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  deleteCategory(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' ? 'Do you want to delete this category?' : 'هل ترغب في حذف هذه الفئة نهائياً؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذفها',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoryService.deleteCategory(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              text: this.currentLang() === 'en' ? 'Category deleted successfully.' : 'تم حذف الفئة بنجاح.',
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