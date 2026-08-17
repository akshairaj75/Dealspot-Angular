import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate-pipe';
import { AuthService } from '../../../core/services/auth.service';

type AuthMode = 'login' | 'register' | 'admin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  translationService = inject(TranslationService);

  constructor(private authService: AuthService,
    private cdref:ChangeDetectorRef
  ) {

  }

  currentLang = this.translationService.currentLang;

  mode: AuthMode = 'login';

  loading = false;

  errorMessage = '';

  returnUrl = '/';
    successMsg = '';


  // Static Cities
  cities = [
    {
      id: 1,
      nameEn: 'Riyadh',
      nameAr: 'الرياض'
    },
    {
      id: 2,
      nameEn: 'Jeddah',
      nameAr: 'جدة'
    },
    {
      id: 3,
      nameEn: 'Dammam',
      nameAr: 'الدمام'
    },
    {
      id: 4,
      nameEn: 'Mecca',
      nameAr: 'مكة'
    },
    {
      id: 5,
      nameEn: 'Medina',
      nameAr: 'المدينة'
    }
  ];

  // Forms
  loginForm!: FormGroup;

  registerForm!: FormGroup;

  adminLoginForm!: FormGroup;

  ngOnInit(): void {

    this.initForms();

    this.route.queryParams.subscribe(params => {

      this.returnUrl = params['returnUrl'] || '/';

      if (params['admin'] === 'true') {

        this.mode = 'admin';

      } else if (this.router.url.includes('/register')) {

        this.mode = 'register';

      } else {

        this.mode = 'login';

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

      phone: ['', [Validators.required, Validators.pattern(/^[+0-9]{10,14}$/)]],

      cityId: ['', Validators.required]

    });

    this.adminLoginForm = this.fb.group({

      email: ['', [Validators.required, Validators.email]],

      password: ['', Validators.required]

    });

  }

  setMode(mode: AuthMode): void {

    this.mode = mode;

    this.errorMessage = '';

    this.loginForm.reset();

    this.registerForm.reset();

    this.adminLoginForm.reset();

  }

  onLoginSubmit(): void {

    if (this.loginForm.invalid) {

      this.loginForm.markAllAsTouched();

      return;

    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.userLogin({ email, password }).subscribe({
      next: (res: any) => {
        this.successMsg = 'Logged in successfully!';
        localStorage.setItem('token', res.token);
        this.router.navigate(['/']);
        this.loading = false;
        console.log(res);
        console.log('Token stored in localStorage:', localStorage.getItem('token'));
        this.cdref.detectChanges();
      },

      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message ||
          'Invalid email or password';
        this.cdref.detectChanges();
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

    console.log('REGISTER REQUEST');

    console.log(this.registerForm.value);

    setTimeout(() => {

      this.loading = false;

      alert('Registration Successful');

      this.mode = 'login';

      this.registerForm.reset();

    }, 1000);

  }

 onAdminLoginSubmit(): void {

  if (this.adminLoginForm.invalid) {
    this.adminLoginForm.markAllAsTouched();
    return;
  }

  this.loading = true;
  this.errorMessage = '';

  const { email, password } = this.adminLoginForm.value;

  this.authService.adminLogin({ email, password }).subscribe({

    next: (res: any) => {
      this.loading = false;

      console.log(res);

      // Store JWT token
      localStorage.setItem('token', res.token);

      // Optional: Store admin details
      localStorage.setItem('user', JSON.stringify(res.user));

      // alert('Admin Login Successful');

      this.router.navigate(['/admin']);
    },

    error: (err) => {
      this.loading = false;

      console.error(err);

      this.errorMessage =
        err?.error?.message || 'Invalid email or password';
    }

  });

}

}