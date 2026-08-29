import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-specs-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="crud-container">
      <div class="crud-header">
        <div>
          <a [routerLink]="['/admin/products']" class="btn-outline btn" style="padding:6px 12px; font-size:12px; margin-bottom:10px; display:inline-flex">
            <span class="material-icons-round">arrow_back</span>
            <span>Back to Products</span>
          </a>
          <h2>Technical Specifications: {{ product()?.name_en }}</h2>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span class="material-icons-round">add</span>
          <span>Add Specification</span>
        </button>
      </div>

      <!-- Specs Table -->
      <div class="card table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Attribute Key (EN)</th>
              <th>Attribute Key (AR)</th>
              <th>Attribute Value (EN)</th>
              <th>Attribute Value (AR)</th>
              <th>Sort Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of specs()">
              <td>{{ d.id }}</td>
              <td><strong>{{ d.attr_key_en }}</strong></td>
              <td><strong>{{ d.attr_key_ar }}</strong></td>
              <td>{{ d.attr_value_en }}</td>
              <td>{{ d.attr_value_ar }}</td>
              <td>{{ d.sort_order }}</td>
              <td>
                <div class="action-buttons-cell">
                  <button class="btn-icon" (click)="openEditModal(d)" title="Edit"><span class="material-icons-round">edit</span></button>
                  <button class="btn-icon text-danger" title="Delete"><span class="material-icons-round">delete</span></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal -->
      <div class="modal-backdrop" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingSpecId ? 'Edit Specification' : 'Add Specification' }}</h3>
            <button class="btn-icon border-none" (click)="closeModal()"><span class="material-icons-round">close</span></button>
          </div>
          <div class="modal-body">
            <form [formGroup]="specForm" (submit)="onSubmit()" class="auth-form">
              <div class="form-group">
                <label class="form-label">Attribute Key (English) e.g. Storage</label>
                <input type="text" formControlName="attr_key_en" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Attribute Key (Arabic)</label>
                <input type="text" formControlName="attr_key_ar" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Attribute Value (English) e.g. 256 GB</label>
                <input type="text" formControlName="attr_value_en" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Attribute Value (Arabic)</label>
                <input type="text" formControlName="attr_value_ar" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Sort Order</label>
                <input type="number" formControlName="sort_order" class="form-control">
              </div>
              <button type="submit" [disabled]="specForm.invalid" class="btn btn-primary w-full">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .crud-container { display: flex; flex-direction: column; gap: 20px; }
    .crud-header { display: flex; justify-content: space-between; align-items: center; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); }
    .admin-table { width: 100%; min-width: 800px; border-collapse: collapse; text-align: left; font-size: 13px; }
    .admin-table th, .admin-table td { padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .admin-table th { font-weight: 700; color: var(--text-secondary); background: var(--surface-hover); white-space: nowrap; }
    .admin-table td { color: var(--text-primary); }
    .action-buttons-cell { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
    .action-buttons-cell button, .action-buttons-cell a { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .w-full { width: 100%; }
    .border-none { border: none; }
  `]
})
export class ProductSpecsCrudComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  // private adminService = inject(AdminService);

  product = signal<any | undefined>(undefined);
  specs = signal<any[]>([]);

  specForm!: FormGroup;
  isModalOpen = false;
  editingSpecId: number | null = null;
  productId!: number;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
  this.productId = Number(this.route.snapshot.paramMap.get('productId'));
      // if (this.productId) {
      //   this.productService.getProductById(this.productId).subscribe(p => this.product.set(p));
      //   this.loadSpecs();
      // } 
    });

    this.specForm = this.fb.group({
      attr_key_en: ['', Validators.required],
      attr_key_ar: ['', Validators.required],
      attr_value_en: ['', Validators.required],
      attr_value_ar: ['', Validators.required],
      sort_order: [1, Validators.required]
    });
  }

  loadSpecs(): void {
    this.productService.getProductSpecs(this.productId).subscribe(res => this.specs.set(res));
  }

  openAddModal(): void {
    this.editingSpecId = null;
    this.specForm.reset({ sort_order: 1 });
    this.isModalOpen = true;
  }

  openEditModal(spec: any): void {
    this.editingSpecId = spec.id;
    this.specForm.patchValue({
      attr_key_en: spec.attr_key_en,
      attr_key_ar: spec.attr_key_ar,
      attr_value_en: spec.attr_value_en,
      attr_value_ar: spec.attr_value_ar,
      sort_order: spec.sort_order
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSubmit(): void {
    if (this.specForm.invalid) return;

    const val = this.specForm.value;
    const payload = {
      product_id: this.productId,
      attr_key_en: val.attr_key_en,
      attr_key_ar: val.attr_key_ar,
      attr_value_en: val.attr_value_en,
      attr_value_ar: val.attr_value_ar,
      sort_order: Number(val.sort_order)
    };

    //   if (this.editingSpecId) {
    //     this.productService.updateProductDetail(this.editingSpecId, payload).subscribe(res => {
    //       this.adminService.logAction('product_detail', res.id, 'UPDATE', 1, payload);
    //       this.loadSpecs();
    //       this.closeModal();
    //     });
    //   } else {
    //     this.productService.createProductDetail(payload).subscribe(res => {
    //       this.adminService.logAction('product_detail', res.id, 'CREATE', 1, payload);
    //       this.loadSpecs();
    //       this.closeModal();
    //     });
    //   }
    // }

    // deleteSpec(id: number): void {
    //   if (confirm('Are you sure you want to delete this specification?')) {
    //     this.productService.deleteProductDetail(id).subscribe(() => {
    //       this.adminService.logAction('product_detail', id, 'DELETE', 1);
    //       this.loadSpecs();
    //     });
    //   }
    // }
  }
}
export { TranslationService } from '../../../core/services/translation.service';
