import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CityService } from '../../../core/services/city.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { APP_CONFIG } from '../../../core/config/app-config';

export type AuthMode = 'login' | 'register' | 'admin';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    CustomSelectComponent
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cityService = inject(CityService);
  private cd = inject(ChangeDetectorRef);

  translationService = inject(TranslationService);
  currentLang = this.translationService.currentLang;
  appConfig = APP_CONFIG;

  mode: AuthMode = 'login';
  loading = false;
  errorMessage = '';
  successMsg = '';
  returnUrl = '/';

  // Password Visibility Toggles
  showLoginPass = false;
  showRegPass = false;
  showRegConfirmPass = false;
  showAdminPass = false;

  // City list for registration
  cities: any[] = [
    { id: 1, nameEn: 'Riyadh', nameAr: 'الرياض' },
    { id: 2, nameEn: 'Jeddah', nameAr: 'جدة' },
    { id: 3, nameEn: 'Dammam', nameAr: 'الدمام' },
    { id: 4, nameEn: 'Mecca', nameAr: 'مكة' },
    { id: 5, nameEn: 'Medina', nameAr: 'المدينة' }
  ];

  // Forms
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  adminLoginForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadCities();

    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || (params['admin'] === 'true' ? '/admin' : '/');

      if (params['admin'] === 'true' || this.router.url.includes('/admin/login')) {
        this.mode = 'admin';
      } else if (params['mode'] === 'register' || this.router.url.includes('/register')) {
        this.mode = 'register';
      } else {
        this.mode = 'login';
      }
      this.cd.detectChanges();
    });
  }

  private loadCities(): void {
    this.cityService.getCities().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.cities = res;
          this.cd.detectChanges();
        }
      },
      error: () => {
        // Fallback static cities remain
      }
    });
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+0-9]{9,15}$/)]],
      cityId: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.adminLoginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  setMode(mode: AuthMode): void {
    this.mode = mode;
    this.errorMessage = '';
    this.successMsg = '';

    // Update query params without reloading
    const queryParams: any = {};
    if (mode === 'admin') {
      queryParams.admin = 'true';
    } else if (mode === 'register') {
      queryParams.mode = 'register';
    }
    if (this.returnUrl && this.returnUrl !== '/' && this.returnUrl !== '/admin') {
      queryParams.returnUrl = this.returnUrl;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMsg = '';

    const { email, password } = this.loginForm.value;

    this.authService.userLogin({ email, password }).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = this.currentLang() === 'en'
          ? `Welcome back, ${res.fullName}!`
          : `أهلاً بك مجدداً، ${res.fullName}!`;

        setTimeout(() => {
          const target = (this.returnUrl && this.returnUrl !== '/login') ? this.returnUrl : '/';
          this.router.navigateByUrl(target);
        }, 600);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message ||
          (this.currentLang() === 'en' ? 'Invalid email or password' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        this.cd.detectChanges();
      }
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMsg = '';

    const val = this.registerForm.value;
    const reqData = {
      fullName: val.fullName,
      email: val.email,
      phone: val.phone,
      cityId: Number(val.cityId),
      password: val.password
    };

    this.authService.userRegister(reqData).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = this.currentLang() === 'en'
          ? `Account created! Welcome, ${res.fullName}!`
          : `تم إنشاء الحساب بنجاح! أهلاً بك، ${res.fullName}!`;

        setTimeout(() => {
          const target = (this.returnUrl && this.returnUrl !== '/login' && this.returnUrl !== '/register') ? this.returnUrl : '/';
          this.router.navigateByUrl(target);
        }, 800);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message ||
          (this.currentLang() === 'en' ? 'Registration failed. Email may already be in use.' : 'فشل إنشاء الحساب. قد يكون البريد الإلكتروني مسجلاً مسبقاً.');
        this.cd.detectChanges();
      }
    });
  }

  onAdminLoginSubmit(): void {
    if (this.adminLoginForm.invalid) {
      this.adminLoginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMsg = '';

    const { email, password } = this.adminLoginForm.value;

    this.authService.adminLogin({ email, password }).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMsg = this.currentLang() === 'en'
          ? `Admin authentication successful. Redirecting...`
          : `تم تسجيل دخول المسؤول بنجاح. جاري التحويل...`;

        setTimeout(() => {
          const target = (this.returnUrl && this.returnUrl.startsWith('/admin')) ? this.returnUrl : '/admin';
          this.router.navigateByUrl(target);
        }, 500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message ||
          (this.currentLang() === 'en' ? 'Invalid admin credentials or account is inactive' : 'بيانات المسؤول غير صحيحة أو الحساب غير مفعّل');
        this.cd.detectChanges();
      }
    });
  }
}