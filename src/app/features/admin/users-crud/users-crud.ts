import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AdminUserService, AdminUser } from '../../../core/services/admin-user.service';
import { TranslationService } from '../../../core/services/translation.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users-crud.html',
  styleUrls: ['./users-crud.css']
})
export class UsersCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminUserService = inject(AdminUserService);
  private cd = inject(ChangeDetectorRef);
  translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;

  admins = signal<AdminUser[]>([]);
  loading = signal(false);
  isModalOpen = signal(false);
  showPassword = signal(false);
  submitting = signal(false);

  searchQuery = '';
  roleFilter = 'ALL';

  adminForm!: FormGroup;

  rolesList = [
    { value: 'SUPER_ADMIN', labelEn: 'Super Administrator', labelAr: 'مشرف عام', badgeClass: 'role-super' },
    { value: 'CONTENT_MANAGER', labelEn: 'Content Manager', labelAr: 'مدير المحتوى والعروض', badgeClass: 'role-content' },
    { value: 'SUPPORT', labelEn: 'Support Specialist', labelAr: 'أخصائي الدعم الفني', badgeClass: 'role-support' },
    { value: 'ANALYST', labelEn: 'Data Analyst', labelAr: 'محلل بيانات وتقارير', badgeClass: 'role-analyst' }
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadAdmins();
  }

  private initForm(): void {
    this.adminForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['CONTENT_MANAGER', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  loadAdmins(): void {
    this.loading.set(true);
    this.adminUserService.getAdmins().subscribe({
      next: (data) => {
        this.admins.set(data || []);
        this.loading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading admin users:', err);
        this.loading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  getFilteredAdmins(): AdminUser[] {
    let list = this.admins();

    if (this.roleFilter !== 'ALL') {
      list = list.filter(a => a.role === this.roleFilter);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
      );
    }

    return list;
  }

  // Stats
  get totalCount(): number {
    return this.admins().length;
  }

  get activeCount(): number {
    return this.admins().filter(a => a.active).length;
  }

  get superAdminCount(): number {
    return this.admins().filter(a => a.role === 'SUPER_ADMIN').length;
  }

  openCreateModal(): void {
    this.adminForm.reset({
      fullName: '',
      email: '',
      role: 'CONTENT_MANAGER',
      password: this.generateRandomPassword()
    });
    this.showPassword.set(false);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Admin@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.adminForm) {
      this.adminForm.patchValue({ password: pass });
    }
    return pass;
  }

  onSubmitCreate(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.adminForm.value;

    this.adminUserService.createAdmin(formVal).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.closeModal();
        this.loadAdmins();

        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Admin Created!' : 'تم إنشاء الحساب بنجاح!',
          html: `<p>${this.currentLang() === 'en' ? 'New staff account created for' : 'تم إنشاء حساب إشرافي جديد للمستخدم'} <b>${created.fullName}</b> (${created.email}).</p>`,
          confirmButtonColor: '#1a6b3c'
        });
      },
      error: (err) => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Creation Failed' : 'فشل إنشاء الحساب',
          text: err.error?.message || (this.currentLang() === 'en' ? 'Failed to create admin user. Email might already exist.' : 'تعذر إنشاء الحساب. قد يكون البريد مسجلاً مسبقاً.'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  toggleStatus(admin: AdminUser): void {
    const actionName = admin.active
      ? (this.currentLang() === 'en' ? 'deactivate' : 'تعطيل')
      : (this.currentLang() === 'en' ? 'activate' : 'تفعيل');

    Swal.fire({
      title: this.currentLang() === 'en' ? `Confirm Status Change` : `تأكيد تغيير الحالة`,
      text: this.currentLang() === 'en'
        ? `Are you sure you want to ${actionName} access for ${admin.fullName}?`
        : `هل أنت متأكد من رغبتك في ${actionName} حساب ${admin.fullName}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: admin.active ? '#d97706' : '#1a6b3c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.currentLang() === 'en' ? `Yes, ${actionName}` : `نعم، ${actionName}`,
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminUserService.toggleAdminStatus(admin.id).subscribe({
          next: (updated) => {
            this.admins.update(list => list.map(a => a.id === updated.id ? updated : a));
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Status Updated' : 'تم تحديث الحالة',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
              text: err.error?.message || 'Failed to update status'
            });
          }
        });
      }
    });
  }

  onDeleteAdmin(admin: AdminUser): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Delete Staff Member?' : 'حذف حساب المشرف؟',
      text: this.currentLang() === 'en'
        ? `Are you sure you want to permanently remove ${admin.fullName} (${admin.email})? This action cannot be undone.`
        : `هل أنت متأكد من رغبتك في حذف حساب ${admin.fullName} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, Delete Permanently' : 'نعم، احذف نهائياً',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminUserService.deleteAdmin(admin.id).subscribe({
          next: () => {
            this.admins.update(list => list.filter(a => a.id !== admin.id));
            Swal.fire({
              icon: 'success',
              title: this.currentLang() === 'en' ? 'Deleted' : 'تم الحذف',
              text: this.currentLang() === 'en' ? 'Admin user removed successfully.' : 'تم حذف المشرف بنجاح.',
              timer: 1500,
              showConfirmButton: false
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.currentLang() === 'en' ? 'Delete Failed' : 'فشل الحذف',
              text: err.error?.message || 'Failed to delete admin user.'
            });
          }
        });
      }
    });
  }

  getRoleBadge(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN': return 'badge-super';
      case 'CONTENT_MANAGER': return 'badge-content';
      case 'SUPPORT': return 'badge-support';
      case 'ANALYST': return 'badge-analyst';
      default: return 'badge-default';
    }
  }

  getRoleLabel(role: string): string {
    const found = this.rolesList.find(r => r.value === role);
    if (!found) return role;
    return this.currentLang() === 'en' ? found.labelEn : found.labelAr;
  }
}
