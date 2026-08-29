import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-specs-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="crud-container">
      <!-- Top Navigation & Header -->
      <div class="crud-header">
        <div class="header-titles">
          <a [routerLink]="['/admin/products', productId, 'details']" class="btn btn-outline btn-back">
            <span class="material-icons-round">arrow_back</span>
            <span>{{ currentLang() === 'en' ? 'Back to Product Details' : 'العودة لتفاصيل المنتج' }}</span>
          </a>
          <h2>
            {{ currentLang() === 'en' ? 'Technical Specifications' : 'المواصفات الفنية للمنتج' }}
            <span class="product-name-highlight" *ngIf="product()">: {{ product()?.nameEn || product()?.name_en }}</span>
          </h2>
          <p class="header-desc">
            {{ currentLang() === 'en' ? 'Configure key-value specifications and technical attributes for this product.' : 'إدارة الضبط والخصائص الفنية للقيم الخاصة بهذا المنتج.' }}
          </p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span class="material-icons-round">add</span>
          <span>{{ currentLang() === 'en' ? 'Add Specification' : 'إضافة مواصفة' }}</span>
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading()">
        <div class="spinner"></div>
        <p>{{ currentLang() === 'en' ? 'Loading specifications...' : 'جاري تحميل المواصفات...' }}</p>
      </div>

      <!-- Specs Card Grid View -->
      <div class="specs-wrapper" *ngIf="!loading()">
        <div class="specs-grid" *ngIf="specs().length > 0; else noSpecs">
          <div class="spec-card-item" *ngFor="let s of specs(); let i = index">
            <div class="card-left">
              <div class="key-badge">
                <span class="material-icons-round key-icon">check_circle</span>
                <span class="key-name-en">{{ s.attrKeyEn || s.attr_key_en || s.keyEn || 'Specification' }}</span>
                <span class="key-name-ar" *ngIf="s.attrKeyAr || s.attr_key_ar">({{ s.attrKeyAr || s.attr_key_ar }})</span>
              </div>
              <div class="val-text">
                <span class="val-en">{{ s.attrValueEn || s.attr_value_en || s.valueEn || '-' }}</span>
                <span class="val-ar" *ngIf="s.attrValueAr || s.attr_value_ar"> / {{ s.attrValueAr || s.attr_value_ar }}</span>
              </div>
            </div>

            <div class="card-right">
              <span class="sort-badge" [title]="currentLang() === 'en' ? 'Sort Order' : 'ترتيب العرض'">#{{ s.sortOrder ?? s.sort_order ?? (i + 1) }}</span>
              <div class="action-btns">
                <button type="button" class="btn-icon" (click)="openEditModal(s, i)" [title]="currentLang() === 'en' ? 'Edit' : 'تعديل'">
                  <span class="material-icons-round">edit</span>
                </button>
                <button type="button" class="btn-icon btn-del" (click)="deleteSpec(i)" [title]="currentLang() === 'en' ? 'Delete' : 'حذف'">
                  <span class="material-icons-round">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <ng-template #noSpecs>
          <div class="empty-card">
            <span class="material-icons-round empty-ico">tune</span>
            <h3>{{ currentLang() === 'en' ? 'No Specifications Added' : 'لا توجد مواصفات فنية' }}</h3>
            <p>{{ currentLang() === 'en' ? 'Add your first technical specification for this product (e.g. Storage, Color, Weight).' : 'أضف أول مواصفة فنية لهذا المنتج (مثل: السعة، اللون، الوزن).' }}</p>
            <button class="btn btn-primary" (click)="openAddModal()">
              <span class="material-icons-round">add</span>
              <span>{{ currentLang() === 'en' ? 'Add Specification' : 'إضافة مواصفة' }}</span>
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Add / Edit Modal -->
      <div class="modal-overlay" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="head-title">
              <span class="material-icons-round head-ico">tune</span>
              <h3>{{ editingIndex !== null ? (currentLang() === 'en' ? 'Edit Specification' : 'تعديل المواصفة') : (currentLang() === 'en' ? 'Add Specification' : 'إضافة مواصفة جديدة') }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="closeModal()">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <form [formGroup]="specForm" (submit)="onSubmit()" class="modal-body">
            <!-- Attribute Key Selector / Custom Input Mode -->
            <div class="form-group" *ngIf="attributeKeys().length > 0 && !isCustomKey">
              <label class="f-label">{{ currentLang() === 'en' ? 'Select Attribute Key' : 'اختر مسمى المواصفة' }}</label>
              <select class="f-input" (change)="onSelectAttributeKey($event)">
                <option value="" disabled selected>{{ currentLang() === 'en' ? '-- Select Existing Key --' : '-- اختر مفتاح مواصفة موجود --' }}</option>
                <option *ngFor="let k of attributeKeys()" [value]="k.id">
                  {{ k.attrKeyEn || k.attr_key_en }} ({{ k.attrKeyAr || k.attr_key_ar }})
                </option>
              </select>
              <button type="button" class="link-btn mt-1" (click)="isCustomKey = true">
                + {{ currentLang() === 'en' ? 'Or type a custom attribute key' : 'أو أدخل مسمى مواصفة جديد' }}
              </button>
            </div>

            <div class="form-row" *ngIf="attributeKeys().length === 0 || isCustomKey">
              <div class="form-group">
                <label class="f-label required">{{ currentLang() === 'en' ? 'Attribute Key (English) *' : 'اسم المواصفة بالإنجليزية *' }}</label>
                <input type="text" formControlName="attrKeyEn" class="f-input" placeholder="e.g. Storage, Color, Weight">
              </div>
              <div class="form-group">
                <label class="f-label required">{{ currentLang() === 'en' ? 'Attribute Key (Arabic) *' : 'اسم المواصفة بالعربية *' }}</label>
                <input type="text" formControlName="attrKeyAr" class="f-input" placeholder="مثال: التخزين، اللون، الوزن">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="f-label required">{{ currentLang() === 'en' ? 'Attribute Value (English) *' : 'قيمة المواصفة بالإنجليزية *' }}</label>
                <input type="text" formControlName="attrValueEn" class="f-input" placeholder="e.g. 256 GB, Space Gray, 1.5 kg">
              </div>
              <div class="form-group">
                <label class="f-label required">{{ currentLang() === 'en' ? 'Attribute Value (Arabic) *' : 'قيمة المواصفة بالعربية *' }}</label>
                <input type="text" formControlName="attrValueAr" class="f-input" placeholder="مثال: 256 جيجابايت، رمادي، 1.5 كجم">
              </div>
            </div>

            <div class="form-group">
              <label class="f-label">{{ currentLang() === 'en' ? 'Sort Order' : 'ترتيب العرض' }}</label>
              <input type="number" formControlName="sortOrder" class="f-input" min="0" placeholder="0">
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="closeModal()">
                {{ currentLang() === 'en' ? 'Cancel' : 'إلغاء' }}
              </button>
              <button type="submit" [disabled]="specForm.invalid || saving()" class="btn btn-primary">
                <span class="material-icons-round">save</span>
                <span>{{ saving() ? (currentLang() === 'en' ? 'Saving...' : 'جاري الحفظ...') : (currentLang() === 'en' ? 'Save Specification' : 'حفظ المواصفة') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .crud-container { display: flex; flex-direction: column; gap: 1.25rem; max-width: 1100px; margin: 0 auto; padding: 0.5rem; }
    .crud-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .header-titles h2 { font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.2rem 0; }
    .header-desc { font-size: 0.83rem; color: var(--text-muted); margin: 0; }
    .product-name-highlight { color: var(--primary); }
    .btn-back { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 600; margin-bottom: 0.5rem; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 0.85rem; color: var(--text-muted); }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(16,185,129,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .specs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.85rem; }
    .spec-card-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; box-shadow: var(--shadow-sm); transition: all 0.15s ease; }
    .spec-card-item:hover { border-color: var(--primary); box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .card-left { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .key-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 700; color: var(--primary); flex-wrap: wrap; }
    .key-icon { font-size: 16px; }
    .key-name-ar { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
    .val-text { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .val-ar { font-size: 0.83rem; color: var(--text-secondary); font-weight: 600; }
    .card-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
    .sort-badge { font-size: 0.7rem; font-family: monospace; background: var(--surface-hover); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; }
    .action-btns { display: flex; align-items: center; gap: 0.35rem; }
    .btn-icon { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; }
    .btn-icon:hover { background: var(--primary-light); color: var(--primary); border-color: rgba(16,185,129,0.3); }
    .btn-icon.btn-del:hover { background: #fef2f2; color: #dc2626; border-color: rgba(220,38,38,0.3); }

    .empty-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1.5rem; text-align: center; gap: 0.75rem; background: var(--surface); border: 1.5px dashed var(--border); border-radius: var(--radius-lg); }
    .empty-ico { font-size: 3rem; color: var(--text-muted); opacity: 0.4; }
    .empty-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .empty-card p { font-size: 0.84rem; color: var(--text-muted); margin: 0; max-width: 420px; }

    /* Modal Overlay & Box */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); animation: popIn 0.18s ease-out; }
    @keyframes popIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.15rem 1.25rem; border-bottom: 1px solid var(--border); }
    .head-title { display: flex; align-items: center; gap: 0.5rem; }
    .head-ico { color: var(--primary); font-size: 1.35rem; }
    .head-title h3 { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0; }
    .btn-close { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 6px; }
    .btn-close:hover { background: var(--surface-hover); color: var(--text-primary); }
    .modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .f-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
    .f-label.required::after { content: ' *'; color: var(--danger); }
    .f-input { width: 100%; padding: 0.55rem 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--text-primary); outline: none; }
    .f-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
    .link-btn { background: none; border: none; color: var(--primary); font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: left; padding: 0; }
    :host-context([dir="rtl"]) .link-btn, [dir="rtl"] .link-btn { text-align: right; }
    .modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem; padding-top: 0.85rem; border-top: 1px solid var(--border); margin-top: 0.5rem; }

    @media (max-width: 640px) {
      .form-row { grid-template-columns: 1fr; }
      .crud-header { flex-direction: column; align-items: stretch; }
      .crud-header .btn { width: 100%; justify-content: center; }
    }
  `]
})
export class ProductSpecsCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private translationService = inject(TranslationService);

  currentLang = this.translationService.currentLang;
  productId!: number;

  product = signal<any | null>(null);
  specs = signal<any[]>([]);
  attributeKeys = signal<any[]>([]);

  loading = signal<boolean>(true);
  saving = signal<boolean>(false);

  specForm!: FormGroup;
  isModalOpen = false;
  editingIndex: number | null = null;
  selectedAttributeKeyId: number | null = null;
  isCustomKey = false;

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      const id = params.get('productId');
      if (id) {
        this.productId = Number(id);
        this.loadProduct();
        this.loadSpecs();
        this.loadAttributeKeys();
      }
    });
  }

  initForm(): void {
    this.specForm = this.fb.group({
      attrKeyEn: ['', Validators.required],
      attrKeyAr: ['', Validators.required],
      attrValueEn: ['', Validators.required],
      attrValueAr: ['', Validators.required],
      sortOrder: [0]
    });
  }

  loadProduct(): void {
    this.productService.getProductById(this.productId).subscribe({
      next: (res) => this.product.set(res),
      error: (err) => console.error('Failed to load product:', err)
    });
  }

  loadSpecs(): void {
    this.loading.set(true);
    this.productService.getProductSpecs(this.productId).subscribe({
      next: (res: any[]) => {
        this.specs.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load product specs:', err);
        this.loading.set(false);
      }
    });
  }

  loadAttributeKeys(): void {
    this.productService.fetchAttributeKeys().subscribe({
      next: (res: any[]) => this.attributeKeys.set(res || []),
      error: (err) => console.error('Failed to load attribute keys:', err)
    });
  }

  onSelectAttributeKey(event: any): void {
    const keyId = Number(event.target.value);
    const found = this.attributeKeys().find(k => Number(k.id) === keyId);
    if (found) {
      this.selectedAttributeKeyId = keyId;
      this.specForm.patchValue({
        attrKeyEn: found.attrKeyEn || found.attr_key_en || '',
        attrKeyAr: found.attrKeyAr || found.attr_key_ar || ''
      });
    }
  }

  openAddModal(): void {
    this.editingIndex = null;
    this.selectedAttributeKeyId = null;
    this.isCustomKey = false;
    this.specForm.reset({
      attrKeyEn: '',
      attrKeyAr: '',
      attrValueEn: '',
      attrValueAr: '',
      sortOrder: this.specs().length + 1
    });
    this.isModalOpen = true;
  }

  openEditModal(spec: any, index: number): void {
    this.editingIndex = index;
    this.selectedAttributeKeyId = spec.attributeKeyId || spec.attribute_key_id || null;
    this.isCustomKey = true;
    this.specForm.reset({
      attrKeyEn: spec.attrKeyEn || spec.attr_key_en || spec.keyEn || '',
      attrKeyAr: spec.attrKeyAr || spec.attr_key_ar || spec.keyAr || '',
      attrValueEn: spec.attrValueEn || spec.attr_value_en || spec.valueEn || '',
      attrValueAr: spec.attrValueAr || spec.attr_value_ar || spec.valueAr || '',
      sortOrder: spec.sortOrder ?? spec.sort_order ?? (index + 1)
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.specForm.invalid) {
      this.specForm.markAllAsTouched();
      return;
    }

    const val = this.specForm.value;
    this.saving.set(true);

    // If new custom key entered, optionally register key first
    const saveSpecData = () => {
      const currentSpecs = [...this.specs()];
      const specPayload = {
        attributeKeyId: this.selectedAttributeKeyId,
        attrKeyEn: val.attrKeyEn,
        attrKeyAr: val.attrKeyAr,
        attrValueEn: val.attrValueEn,
        attrValueAr: val.attrValueAr,
        sortOrder: Number(val.sortOrder || 0)
      };

      if (this.editingIndex !== null) {
        currentSpecs[this.editingIndex] = { ...currentSpecs[this.editingIndex], ...specPayload };
      } else {
        currentSpecs.push(specPayload);
      }

      this.saveAllProductDetails(currentSpecs);
    };

    if (this.isCustomKey && val.attrKeyEn && val.attrKeyAr) {
      this.productService.addAttributeKey({ attrKeyEn: val.attrKeyEn, attrKeyAr: val.attrKeyAr }).subscribe({
        next: (keyRes) => {
          if (keyRes && keyRes.id) {
            this.selectedAttributeKeyId = keyRes.id;
          }
          saveSpecData();
        },
        error: () => saveSpecData() // proceed even if key exists
      });
    } else {
      saveSpecData();
    }
  }

  deleteSpec(index: number): void {
    Swal.fire({
      title: this.currentLang() === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟',
      text: this.currentLang() === 'en' ? 'Do you want to remove this specification?' : 'هل تريد حذف هذه المواصفة؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.currentLang() === 'en' ? 'Yes, delete it!' : 'نعم، احذفها!',
      cancelButtonText: this.currentLang() === 'en' ? 'Cancel' : 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        const currentSpecs = [...this.specs()];
        currentSpecs.splice(index, 1);
        this.saveAllProductDetails(currentSpecs);
      }
    });
  }

  private saveAllProductDetails(updatedSpecs: any[]): void {
    const p = this.product();
    if (!p) {
      this.saving.set(false);
      return;
    }

    const payload = {
      nameEn: p.nameEn || p.name_en,
      nameAr: p.nameAr || p.name_ar,
      brandId: p.brandId || p.brand_id || p.brand?.id,
      categoryId: p.categoryId || p.category_id,
      sku: p.sku || '',
      barcode: p.barcode || '',
      unit: p.unit || 'EACH',
      unitSize: p.unitSize || p.unit_size || 1,
      descriptionEn: p.descriptionEn || p.description_en || '',
      descriptionAr: p.descriptionAr || p.description_ar || '',
      active: p.active === true || p.is_active === 1 || p.isActive === true,
      details: updatedSpecs.map(s => ({
        attributeKeyId: s.attributeKeyId || s.attribute_key_id,
        attrKeyEn: s.attrKeyEn || s.attr_key_en,
        attrKeyAr: s.attrKeyAr || s.attr_key_ar,
        attrValueEn: s.attrValueEn || s.attr_value_en,
        attrValueAr: s.attrValueAr || s.attr_value_ar,
        sortOrder: s.sortOrder ?? s.sort_order ?? 0
      }))
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    this.productService.updateProduct(this.productId, formData).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.currentLang() === 'en' ? 'Saved!' : 'تم الحفظ!',
          text: this.currentLang() === 'en' ? 'Technical specifications updated successfully.' : 'تم تحديث المواصفات الفنية بنجاح.',
          timer: 1800,
          showConfirmButton: false
        });
        this.saving.set(false);
        this.closeModal();
        this.loadSpecs();
      },
      error: (err) => {
        console.error('Failed to update specifications:', err);
        this.saving.set(false);
        Swal.fire({
          icon: 'error',
          title: this.currentLang() === 'en' ? 'Error' : 'خطأ',
          text: err?.error?.message || (this.currentLang() === 'en' ? 'Failed to update specifications.' : 'فشل حفظ المواصفات.')
        });
      }
    });
  }
}
