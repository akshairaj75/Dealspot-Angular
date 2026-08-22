import { Component, inject, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CouponService } from '../../../core/services/coupon.service';
import { StoreService } from '../../../core/services/store.service';
import { OfferService } from '../../../core/services/offer.service';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-coupons-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './coupons-crud.component.html',
  styleUrl: './coupons-crud.component.css'
})
export class CouponsCrudComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private couponService = inject(CouponService);
  private storeService = inject(StoreService);
  private offerService = inject(OfferService);
  private productService = inject(ProductService);
  public authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private cd = inject(ChangeDetectorRef);

  currentLang = this.translationService.currentLang;
  filePath = environment.filePath;

  coupons = signal<any[]>([]);
  stores = signal<any[]>([]);
  offers = signal<any[]>([]);

  // Product Selection & Live Search State
  selectedProduct = signal<any | null>(null);
  productOptions = signal<any[]>([]);
  productSearchLoading = signal<boolean>(false);
  isProductDropdownOpen = signal<boolean>(false);
  productSearchText = '';
  private productSearchSubject = new Subject<string>();
  private productSearchSub?: Subscription;

  filteredCoupons = signal<any[]>([]);

  searchQuery = '';
  selectedStoreFilter: number | string = '';
  selectedDiscountTypeFilter: string = '';
  selectedStatusFilter: string = 'all';

  couponForm!: FormGroup;
  isModalOpen = false;
  editingCouponId: number | null = null;
  loading = false;
  copiedCouponId: number | null = null;

  ngOnInit(): void {
    if (this.authService.isStoreManager() && this.authService.currentUser()?.storeId) {
      this.selectedStoreFilter = this.authService.currentUser()?.storeId!;
    }
    this.initForm();
    this.loadCoupons();
    this.loadDropdowns();

    this.productSearchSub = this.productSearchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchProducts(query);
    });
  }

  ngOnDestroy(): void {
    this.productSearchSub?.unsubscribe();
  }

  initForm(): void {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
      store_id: ['', Validators.required],
      offer_id: [null],
      product_id: [null],
      discount_type: ['PERCENT', Validators.required],
      discount_value: [10, [Validators.required, Validators.min(0.01)]],
      min_cart_value: [0, [Validators.required, Validators.min(0)]],
      max_uses: [100, [Validators.required, Validators.min(1)]],
      valid_from: ['', Validators.required],
      valid_until: ['', Validators.required],
      is_active: [true]
    });
  }

  loadCoupons(): void {
    this.couponService.getAllCoupons().subscribe({
      next: (res) => {
        this.coupons.set(res || []);
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load coupons:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  loadDropdowns(): void {
    this.storeService.getStores().subscribe({
      next: (res) => {
        this.stores.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load stores:', err)
    });

    this.offerService.getAllOffers().subscribe({
      next: (res) => {
        this.offers.set(res || []);
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load offers:', err)
    });

    this.searchProducts('');
  }

  onProductSearchInput(query: string): void {
    this.productSearchText = query;
    this.isProductDropdownOpen.set(true);
    this.productSearchSubject.next(query);
  }

  openProductDropdown(): void {
    this.isProductDropdownOpen.set(true);
    if (this.productOptions().length === 0) {
      this.searchProducts(this.productSearchText);
    }
  }

  closeProductDropdown(): void {
    setTimeout(() => {
      this.isProductDropdownOpen.set(false);
      this.cd.detectChanges();
    }, 250);
  }

  selectProduct(product: any | null): void {
    this.selectedProduct.set(product);
    this.couponForm.patchValue({ product_id: product ? product.id : null });
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.cd.detectChanges();
  }

  clearSelectedProduct(): void {
    this.selectProduct(null);
  }

  getProductImageUrl(product: any): string {
    if (!product) return 'assets/images/placeholder-product.png';
    const raw = product.primaryImageUrl || product.primary_image_url || product.imageUrl || product.image_url;
    if (raw && typeof raw === 'string' && raw.trim() !== '') {
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
        return raw;
      }
      return this.filePath + raw;
    }
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      const img = typeof first === 'string' ? first : (first.imageUrl || first.image_url);
      if (img) {
        if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
          return img;
        }
        return this.filePath + img;
      }
    }
    return 'assets/images/placeholder-product.png';
  }

  searchProducts(query: string = ''): void {
    this.productSearchLoading.set(true);
    this.productService.getPagedProducts(0, 30, query).subscribe({
      next: (res) => {
        const items = res?.content || [];
        this.productOptions.set(items);
        this.productSearchLoading.set(false);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to query products:', err);
        this.productSearchLoading.set(false);
        this.cd.detectChanges();
      }
    });
  }

  applyFilter(): void {
    const query = this.searchQuery.toLowerCase().trim();
    let list = this.coupons();

    if (query) {
      list = list.filter(c =>
        (c.code && c.code.toLowerCase().includes(query)) ||
        (c.storeNameEn && c.storeNameEn.toLowerCase().includes(query)) ||
        (c.storeNameAr && c.storeNameAr.toLowerCase().includes(query)) ||
        (c.offerTitleEn && c.offerTitleEn.toLowerCase().includes(query)) ||
        (c.offerTitleAr && c.offerTitleAr.toLowerCase().includes(query)) ||
        (c.id && c.id.toString().includes(query))
      );
    }

    if (this.selectedStoreFilter) {
      list = list.filter(c => c.storeId === Number(this.selectedStoreFilter) || c.store_id === Number(this.selectedStoreFilter));
    }

    if (this.selectedDiscountTypeFilter) {
      list = list.filter(c => c.discountType === this.selectedDiscountTypeFilter || c.discount_type === this.selectedDiscountTypeFilter);
    }

    if (this.selectedStatusFilter === 'active') {
      list = list.filter(c => c.active === true || c.is_active === 1 || c.active === 1);
    } else if (this.selectedStatusFilter === 'inactive') {
      list = list.filter(c => c.active === false || c.is_active === 0 || c.active === 0);
    }

    this.filteredCoupons.set(list);
  }

  openAddModal(): void {
    this.editingCouponId = null;
    this.selectedProduct.set(null);
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.searchProducts('');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const defaultStoreId = (this.authService.isStoreManager() && this.authService.currentUser()?.storeId)
      ? this.authService.currentUser()?.storeId
      : (this.stores().length > 0 ? this.stores()[0].id : '');

    this.couponForm.reset({
      code: '',
      store_id: defaultStoreId,
      offer_id: null,
      product_id: null,
      discount_type: 'PERCENT',
      discount_value: 10,
      min_cart_value: 0,
      max_uses: 100,
      valid_from: today,
      valid_until: nextMonth,
      is_active: true
    });
    this.isModalOpen = true;
  }


  openEditModal(c: any): void {
    this.editingCouponId = c.id;
    this.isProductDropdownOpen.set(false);
    this.productSearchText = '';
    this.searchProducts('');
    let dType = c.discountType || c.discount_type || 'PERCENT';
    if (dType === 'PERCENTAGE') dType = 'PERCENT';
    if (dType === 'FIXED') dType = 'FIXED_SAR';

    const pId = c.productId || c.product_id || null;

    if (pId) {
      this.productService.getProductById(pId).subscribe({
        next: (prod) => {
          if (prod) {
            this.selectedProduct.set(prod);
          }
          this.cd.detectChanges();
        },
        error: () => {
          this.selectedProduct.set({
            id: pId,
            nameEn: c.productNameEn || c.product?.nameEn,
            nameAr: c.productNameAr || c.product?.nameAr
          });
          this.cd.detectChanges();
        }
      });
    } else {
      this.selectedProduct.set(null);
    }

    this.couponForm.reset({
      code: c.code || '',
      store_id: c.storeId || c.store_id || '',
      offer_id: c.offerId || c.offer_id || null,
      product_id: pId,
      discount_type: dType,
      discount_value: c.discountValue !== undefined ? c.discountValue : (c.discount_value !== undefined ? c.discount_value : 10),
      min_cart_value: c.minCartValue !== undefined ? c.minCartValue : (c.min_cart_value !== undefined ? c.min_cart_value : 0),
      max_uses: c.maxUses !== undefined ? c.maxUses : (c.max_uses !== undefined ? c.max_uses : 100),
      valid_from: c.validFrom || c.valid_from || '',
      valid_until: c.validUntil || c.valid_until || '',
      is_active: c.active === true || c.is_active === 1 || c.active === 1 || c.active === undefined
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  copyCode(code: string, id: number): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.copiedCouponId = id;
      setTimeout(() => {
        this.copiedCouponId = null;
        this.cd.detectChanges();
      }, 2000);
    }
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const val = this.couponForm.value;
    const payload = {
      code: val.code ? val.code.trim().toUpperCase() : '',
      storeId: Number(val.store_id),
      offerId: val.offer_id ? Number(val.offer_id) : null,
      productId: val.product_id ? Number(val.product_id) : null,
      discountType: val.discount_type,
      discountValue: Number(val.discount_value),
      minCartValue: Number(val.min_cart_value || 0),
      maxUses: val.max_uses ? Number(val.max_uses) : null,
      validFrom: val.valid_from,
      validUntil: val.valid_until,
      active: !!val.is_active
    };

    const request = this.editingCouponId
      ? this.couponService.updateCoupon(this.editingCouponId, payload)
      : this.couponService.addCoupon(payload);

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? (this.editingCouponId ? 'Updated!' : 'Created!') : (this.editingCouponId ? 'تم التحديث!' : 'تمت الإضافة!'),
          text: this.currentLang() === 'en'
            ? (this.editingCouponId ? 'Coupon code updated successfully.' : 'Coupon code created successfully.')
            : (this.editingCouponId ? 'تم تحديث كود الخصم بنجاح.' : 'تم إنشاء كود الخصم بنجاح.'),
          timer: 2000,
          showConfirmButton: false
        });
        this.loadCoupons();
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save coupon:', err);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to save coupon code.' : 'فشل حفظ كود الخصم.')
        });
      }
    });
  }

  deleteCoupon(id: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en'
        ? 'Do you want to permanently delete this coupon code?'
        : 'هل تريد حذف كود الخصم هذا نهائياً؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذف!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.couponService.deleteCoupon(id).subscribe({
          next: () => {
            Swal.fire(
              this.currentLang() === 'en' ? 'Deleted!' : 'تم الحذف!',
              this.currentLang() === 'en' ? 'Coupon code has been deleted.' : 'تم حذف كود الخصم بنجاح.',
              'success'
            );
            this.loadCoupons();
          },
          error: (err) => {
            console.error(err);
            Swal.fire(
              this.currentLang() === 'en' ? 'Error' : 'خطأ',
              this.currentLang() === 'en' ? 'Failed to delete coupon.' : 'فشل حذف كود الخصم.',
              'error'
            );
          }
        });
      }
    });
  }
}
