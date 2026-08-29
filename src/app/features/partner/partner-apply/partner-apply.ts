import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PartnerRequestService } from '../../../core/services/partner-request.service';
import { CityService } from '../../../core/services/city.service';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-apply',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe, CustomSelectComponent],
  templateUrl: './partner-apply.html',
  styleUrls: ['./partner-apply.css']
})
export class PartnerApplyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private partnerService = inject(PartnerRequestService);
  private cityService = inject(CityService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  translationService = inject(TranslationService);
  currentLang = this.translationService.currentLang;

  applyForm!: FormGroup;
  submitting = signal(false);

  cities = signal<any[]>([]);
  categories = signal<any[]>([]);

  ngOnInit(): void {
    this.initForm();
    this.loadDropdowns();
  }

  private initForm(): void {
    const user = this.authService.currentUser();

    this.applyForm = this.fb.group({
      applicantName: [user?.fullName || '', [Validators.required, Validators.minLength(3)]],
      applicantEmail: [user?.email || '', [Validators.required, Validators.email]],
      applicantPhone: ['', [Validators.required, Validators.pattern(/^[+0-9]{9,15}$/)]],
      storeNameEn: ['', [Validators.required, Validators.minLength(2)]],
      storeNameAr: ['', [Validators.required, Validators.minLength(2)]],
      descriptionEn: [''],
      descriptionAr: [''],
      cityId: ['', Validators.required],
      categoryId: ['', Validators.required],
      crNumber: ['', [Validators.required, Validators.minLength(7)]],
      vatNumber: [''],
      website: [''],
      contactAddress: ['']
    });
  }

  private loadDropdowns(): void {
    this.cityService.getCities().subscribe({
      next: (res) => {
        this.cities.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load cities:', err)
    });

    this.categoryService.getCategories().subscribe({
      next: (res: any[]) => {
        const topLevel = (res || []).filter(c => c.parentId === null);
        this.categories.set(topLevel.length > 0 ? topLevel : res);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  onSubmit(): void {
    if (this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.applyForm.value;

    const reqData = {
      ...formVal,
      cityId: Number(formVal.cityId),
      categoryId: Number(formVal.categoryId)
    };

    this.partnerService.submitApplication(reqData).subscribe({
      next: (res) => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Application Submitted!' : 'تم تقديم الطلب بنجاح!',
          html: `<p>${this.currentLang() === 'en' 
            ? 'Thank you for applying to partner with DealSpot. Our verification team will review your Commercial Registration and store details within 24-48 hours.'
            : 'شكراً لتقديم طلب الانضمام إلى ديل سبوت. سيقوم فريق التحقق بمراجعة السجل التجاري وبيانات المتجر خلال 24-48 ساعة.'}</p>`,
          confirmButtonColor: '#1a6b3c',
          confirmButtonText: this.currentLang() === 'en' ? 'Back to Home' : 'العودة للرئيسية'
        }).then(() => {
          this.router.navigate(['/']);
        });
      },
      error: (err) => {
        this.submitting.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Submission Failed' : 'فشل إرسال الطلب',
          text: err.error?.message || (this.currentLang() === 'en' ? 'An error occurred while submitting your application.' : 'حدث خطأ أثناء إرسال طلب الشراكة.'),
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
