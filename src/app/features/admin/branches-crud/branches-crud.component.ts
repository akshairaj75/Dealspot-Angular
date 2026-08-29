import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { StoreBranchService } from '../../../core/services/store-branch.service';
import { CityService } from '../../../core/services/city.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-branches-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CustomSelectComponent],
  templateUrl: './branches-crud.component.html',
  styleUrl: './branches-crud.component.css'
})
export class BranchesCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private storeService = inject(StoreService);
  private branchService = inject(StoreBranchService);
  private cityService = inject(CityService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;

  store = signal<any | null>(null);
  branches = signal<any[]>([]);
  cities = signal<any[]>([]);

  branchForm!: FormGroup;
  isModalOpen = false;
  editingBranchId: number | null = null;
  storeId!: number;
  loading = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.storeId = Number(idParam);
        this.loadStoreInfo();
        this.loadBranches();
      }
    });

    this.loadCities();
    this.initForm();
  }

  initForm(): void {
    this.branchForm = this.fb.group({
      branchName: ['', Validators.required],
      cityId: ['', Validators.required],
      addressEn: [''],
      addressAr: [''],
      latitude: [24.7136, [Validators.required]],
      longitude: [46.6753, [Validators.required]],
      phone: [''],
      openTime: ['08:00', Validators.required],
      closeTime: ['23:00', Validators.required],
      twentyFourHours: [false],
      isActive: [true]
    });
  }

  loadStoreInfo(): void {
    this.storeService.getStoreById(this.storeId).subscribe({
      next: (res) => {
        this.store.set(res);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load store info:', err)
    });
  }

  loadCities(): void {
    this.cityService.getCities().subscribe({
      next: (res: any[]) => {
        this.cities.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });
  }

  loadBranches(): void {
    this.loading = true;
    this.branchService.getBranchesByStoreId(this.storeId).subscribe({
      next: (res) => {
        this.branches.set(res || []);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load branches:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  openAddModal(): void {
    this.editingBranchId = null;
    this.branchForm.reset({
      branchName: '',
      cityId: this.cities().length > 0 ? this.cities()[0].id : '',
      addressEn: '',
      addressAr: '',
      latitude: 24.7136,
      longitude: 46.6753,
      phone: '',
      openTime: '08:00',
      closeTime: '23:00',
      twentyFourHours: false,
      isActive: true
    });
    this.isModalOpen = true;
  }

  openEditModal(branch: any): void {
    this.editingBranchId = branch.id;
    
    // Normalize times for HTML5 time input (HH:mm)
    let open = (branch.openTime || branch.open_time || '08:00').slice(0, 5);
    let close = (branch.closeTime || branch.close_time || '23:00').slice(0, 5);

    this.branchForm.reset({
      branchName: branch.branchName || branch.branch_name || '',
      cityId: branch.cityId || branch.city_id || '',
      addressEn: branch.addressEn || branch.address_en || '',
      addressAr: branch.addressAr || branch.address_ar || '',
      latitude: branch.latitude ?? 24.7136,
      longitude: branch.longitude ?? 46.6753,
      phone: branch.phone || '',
      openTime: open,
      closeTime: close,
      twentyFourHours: branch.twentyFourHours === true || branch.is_24_hours === 1,
      isActive: branch.active === 1 || branch.active === true || branch.isActive === true || branch.is_active === 1
    });
    this.isModalOpen = true;
  }

  setTimePreset(controlName: 'openTime' | 'closeTime', timeStr: string): void {
    this.branchForm.patchValue({ [controlName]: timeStr });
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const val = this.branchForm.value;

    let openTime = val.openTime ? val.openTime.trim() : '08:00';
    let closeTime = val.closeTime ? val.closeTime.trim() : '23:00';
    if (openTime.length === 5) openTime += ':00';
    if (closeTime.length === 5) closeTime += ':00';

    const payload = {
      storeId: this.storeId,
      cityId: Number(val.cityId),
      branchName: val.branchName,
      addressEn: val.addressEn || '',
      addressAr: val.addressAr || '',
      latitude: Number(val.latitude),
      longitude: Number(val.longitude),
      phone: val.phone || '',
      openTime: openTime,
      closeTime: closeTime,
      twentyFourHours: !!val.twentyFourHours,
      active: !!val.isActive
    };

    const request = this.editingBranchId
      ? this.branchService.updateBranch(this.editingBranchId, payload)
      : this.branchService.addBranch(payload);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingBranchId ? 'Updated!' : 'Created!') : (this.editingBranchId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingBranchId ? 'Branch updated successfully.' : 'Branch created successfully.')
            : (this.editingBranchId ? 'تم تحديث الفرع بنجاح.' : 'تم إضافة الفرع بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadBranches();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Something went wrong.' : 'حدث خطأ ما.')
        });
      }
    });
  }

  deleteBranch(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' 
        ? 'Do you want to delete this store branch?' 
        : 'هل تريد حذف هذا الفرع؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.branchService.deleteBranch(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              text: this.currentLang() === 'en' ? 'Branch has been deleted.' : 'تم حذف الفرع بنجاح.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadBranches();
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
              text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to delete branch.' : 'فشل حذف الفرع.')
            });
          }
        });
      }
    });
  }
}
