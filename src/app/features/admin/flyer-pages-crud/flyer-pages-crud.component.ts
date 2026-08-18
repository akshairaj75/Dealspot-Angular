import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FlyerService } from '../../../core/services/flyer.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-flyer-pages-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './flyer-pages-crud.component.html',
  styleUrl: './flyer-pages-crud.component.css'
})
export class FlyerPagesCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private flyerService = inject(FlyerService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  flyer = signal<any | null>(null);
  pages = signal<any[]>([]);

  pageForm!: FormGroup;
  isModalOpen = false;
  editingPageId: number | null = null;
  flyerId!: number;
  loading = false;

  selectedFile: File | null = null;
  previewUrl: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.flyerId = Number(idParam);
        this.loadFlyerInfo();
        this.loadPages();
      }
    });
  }

  initForm(): void {
    this.pageForm = this.fb.group({
      page_number: [1, [Validators.required, Validators.min(1)]]
    });
  }

  loadFlyerInfo(): void {
    this.flyerService.getFlyerById(this.flyerId).subscribe({
      next: (res) => {
        this.flyer.set(res);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load flyer:', err)
    });
  }

  loadPages(): void {
    this.loading = true;
    this.flyerService.getFlyerPages(this.flyerId).subscribe({
      next: (res) => {
        this.pages.set(res || []);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load flyer pages:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  openAddModal(): void {
    this.editingPageId = null;
    this.selectedFile = null;
    this.previewUrl = null;

    const nextNumber = this.pages().length + 1;
    this.pageForm.reset({
      page_number: nextNumber
    });
    this.isModalOpen = true;
  }

  openEditModal(page: any): void {
    this.editingPageId = page.id;
    this.selectedFile = null;
    this.previewUrl = this.getPageImageUrl(page);

    this.pageForm.reset({
      page_number: page.pageNumber || page.page_number || 1
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.previewUrl = null;
    this.selectedFile = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        this.cd.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  getPageImageUrl(page: any): string {
    const url = page.imageUrl || page.thumbUrl;
    if (!url) return 'https://placehold.co/200x280?text=No+Image';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return this.filePath + url;
  }

  onSubmit(): void {
    if (this.pageForm.invalid) {
      this.pageForm.markAllAsTouched();
      return;
    }

    if (!this.editingPageId && !this.selectedFile) {
      Swal.fire({
        icon: 'warning',
        title: this.currentLang() === 'en' ? 'Image Required' : 'الصورة مطلوبة',
        text: this.currentLang() === 'en' ? 'Please choose an image file for this flyer page.' : 'يرجى اختيار صورة لصفحة المنشور.'
      });
      return;
    }

    const pageNumber = Number(this.pageForm.get('page_number')?.value);
    const formData = new FormData();
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    const request = this.editingPageId
      ? this.flyerService.updateFlyerPage(this.editingPageId, formData, pageNumber)
      : this.flyerService.addFlyerPage(this.flyerId, formData, pageNumber);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingPageId ? 'Updated!' : 'Added!') : (this.editingPageId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingPageId ? 'Page updated successfully.' : 'Page added successfully.')
            : (this.editingPageId ? 'تم تحديث الصفحة بنجاح.' : 'تم إضافة الصفحة بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadPages();
        this.loadFlyerInfo();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save flyer page:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save flyer page.' : 'فشل حفظ صفحة المنشور.')
        });
      }
    });
  }

  deletePage(pageId: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Page?' : 'حذف الصفحة؟',
      text: this.currentLang() === 'en'
        ? 'Are you sure you want to delete this catalogue sheet?'
        : 'هل أنت متأكد من رغبتك في حذف هذه الصفحة من الكتالوج؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.flyerService.deleteFlyerPage(pageId).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Page sheet has been deleted.' : 'تم حذف الصفحة بنجاح.',
              'success'
            );
            this.loadPages();
            this.loadFlyerInfo();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete page.' : 'فشل حذف الصفحة.',
              'error'
            );
          }
        });
      }
    });
  }
}
