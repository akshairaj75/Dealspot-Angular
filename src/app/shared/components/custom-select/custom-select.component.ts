import {
  Component,
  ElementRef,
  HostListener,
  HostBinding,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  inject,
  signal,
  computed,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../environment/environment';

export interface CustomSelectOption {
  id?: any;
  value?: any;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  label?: string;
  logoUrl?: string;
  image?: string;
  icon?: string;
  disabled?: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="custom-select-wrapper"
      [class.open]="isOpen()"
      [class.disabled]="disabled"
      [class.has-value]="selectedValue !== null && selectedValue !== undefined && selectedValue !== ''"
      [dir]="currentLang() === 'ar' ? 'rtl' : 'ltr'"
    >
      <!-- Trigger Box -->
      <div
        class="custom-select-trigger"
        (click)="toggleDropdown($event)"
        [attr.tabindex]="disabled ? -1 : 0"
        (keydown.enter)="toggleDropdown($event)"
        (keydown.space)="toggleDropdown($event)"
        (keydown.escape)="closeDropdown()"
      >
        <div class="trigger-content">
          <!-- Optional Image/Icon Thumbnail -->
          <img
            *ngIf="selectedOptionObj?.logoUrl || selectedOptionObj?.image || selectedOptionObj?.brandImage"
            [src]="getOptionImage(selectedOptionObj)"
            class="trigger-thumb"
            alt="thumb"
          />
          <span
            *ngIf="selectedOptionObj?.icon && !selectedOptionObj?.logoUrl && !selectedOptionObj?.image"
            class="material-icons-round trigger-icon"
          >
            {{ selectedOptionObj.icon }}
          </span>

          <!-- Label / Placeholder -->
          <span class="trigger-label" [class.placeholder-text]="!selectedOptionObj">
            {{ getSelectedLabel() }}
          </span>
        </div>

        <div class="trigger-actions">
          <!-- Clear Button -->
          <button
            type="button"
            class="btn-clear"
            *ngIf="clearable && selectedValue !== null && selectedValue !== undefined && selectedValue !== '' && !disabled"
            (click)="clearSelection($event)"
            title="Clear selection"
          >
            <span class="material-icons-round">close</span>
          </button>

          <!-- Chevron Arrow -->
          <span class="material-icons-round chevron-icon">expand_more</span>
        </div>
      </div>

      <!-- Floating Options Dropdown Menu -->
      <div class="custom-select-dropdown" *ngIf="isOpen()" (click)="$event.stopPropagation()">
        <!-- Optional Search Bar -->
        <div class="dropdown-search-wrapper" *ngIf="isSearchable">
          <span class="material-icons-round search-icon">search</span>
          <input
            #searchInput
            type="text"
            class="dropdown-search-input"
            [placeholder]="currentLang() === 'en' ? 'Search options...' : 'بحث في الخيارات...'"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchInput($event)"
            (keydown.escape)="closeDropdown()"
          />
          <button
            type="button"
            class="search-clear-btn"
            *ngIf="searchQuery()"
            (click)="clearSearch($event)"
          >
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Options Scrollable List -->
        <ul class="dropdown-options-list">
          <!-- Reset / Unset Choice if allowed -->
          <li
            class="dropdown-option-item unset-option"
            *ngIf="allowUnset && selectedValue !== null"
            (click)="selectOption(null, $event)"
          >
            <span class="option-label text-muted">{{ unsetLabel || (currentLang() === 'en' ? '-- None --' : '-- بدون --') }}</span>
          </li>

          <!-- Render Filtered Options -->
          <li
            *ngFor="let opt of filteredOptions(); let i = index"
            class="dropdown-option-item"
            [class.selected]="isOptionSelected(opt)"
            [class.disabled]="opt.disabled"
            (click)="selectOption(opt, $event)"
          >
            <div class="option-left">
              <img
                *ngIf="opt?.logoUrl || opt?.image || opt?.brandImage"
                [src]="getOptionImage(opt)"
                class="option-thumb"
                alt="thumb"
              />
              <span
                *ngIf="opt?.icon && !opt?.logoUrl && !opt?.image"
                class="material-icons-round option-icon"
              >
                {{ opt.icon }}
              </span>
              <span class="option-label">{{ getOptionLabel(opt) }}</span>
            </div>

            <span class="material-icons-round check-icon" *ngIf="isOptionSelected(opt)">check</span>
          </li>

          <!-- Empty State -->
          <li class="dropdown-empty-state" *ngIf="filteredOptions().length === 0">
            <span class="material-icons-round empty-icon">search_off</span>
            <span>{{ currentLang() === 'en' ? 'No matching options' : 'لا توجد خيارات مطابقة' }}</span>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
      font-family: inherit;
    }

    .custom-select-wrapper {
      position: relative;
      width: 100%;
    }

    .custom-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 42px;
      padding: 0.5rem 0.85rem;
      background: var(--surface, #ffffff);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      color: var(--text-primary, #0f172a);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.18s ease;
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04));
    }

    .custom-select-trigger:hover {
      border-color: var(--primary, #10b981);
    }

    .custom-select-wrapper.open .custom-select-trigger {
      border-color: var(--primary, #10b981);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
      background: var(--surface, #ffffff);
    }

    .custom-select-wrapper.disabled .custom-select-trigger {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--surface-hover, #f8fafc);
      border-color: var(--border, #e2e8f0);
    }

    .trigger-content {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      flex: 1;
    }

    .trigger-thumb {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--border, #e2e8f0);
    }

    .trigger-icon {
      font-size: 18px;
      color: var(--primary, #10b981);
      flex-shrink: 0;
    }

    .trigger-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
    }

    .trigger-label.placeholder-text {
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
    }

    .trigger-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
      margin-left: 0.35rem;
    }
    :host-context([dir="rtl"]) .trigger-actions, [dir="rtl"] .trigger-actions {
      margin-left: 0;
      margin-right: 0.35rem;
    }

    .btn-clear {
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .btn-clear:hover {
      color: #ef4444;
      background: #fee2e2;
    }
    .btn-clear span {
      font-size: 16px;
    }

    .chevron-icon {
      font-size: 20px;
      color: var(--text-muted, #64748b);
      transition: transform 0.2s ease;
    }

    .custom-select-wrapper.open .chevron-icon {
      transform: rotate(180deg);
      color: var(--primary, #10b981);
    }

    /* Floating Dropdown Panel */
    .custom-select-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 1050;
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #cbd5e1);
      border-radius: var(--radius-lg, 10px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: dropDownSlide 0.16s ease-out;
    }

    @keyframes dropDownSlide {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-search-wrapper {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.65rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
      background: var(--surface-hover, #f8fafc);
    }

    .search-icon {
      font-size: 18px;
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .dropdown-search-input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.82rem;
      color: var(--text-primary, #0f172a);
    }

    .search-clear-btn {
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }

    .dropdown-options-list {
      list-style: none;
      margin: 0;
      padding: 0.35rem 0;
      max-height: 240px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .dropdown-option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0.85rem;
      font-size: 0.84rem;
      color: var(--text-primary, #1e293b);
      cursor: pointer;
      transition: background 0.12s ease;
    }

    .dropdown-option-item:hover {
      background: var(--primary-light, #ecfdf5);
      color: var(--primary, #10b981);
    }

    .dropdown-option-item.selected {
      background: var(--primary-light, #ecfdf5);
      color: var(--primary, #10b981);
      font-weight: 700;
    }

    .dropdown-option-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .option-left {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      flex: 1;
    }

    .option-thumb {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      object-fit: cover;
      border: 1px solid var(--border, #e2e8f0);
      flex-shrink: 0;
    }

    .option-icon {
      font-size: 16px;
      color: var(--primary, #10b981);
    }

    .option-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .check-icon {
      font-size: 18px;
      color: var(--primary, #10b981);
      flex-shrink: 0;
      margin-left: 0.5rem;
    }
    :host-context([dir="rtl"]) .check-icon, [dir="rtl"] .check-icon {
      margin-left: 0;
      margin-right: 0.5rem;
    }

    .dropdown-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      gap: 0.35rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
    }
    .empty-icon {
      font-size: 24px;
    }
  `]
})
export class CustomSelectComponent implements ControlValueAccessor {
  private el = inject(ElementRef);
  private cd = inject(ChangeDetectorRef);
  private translationService = inject(TranslationService);

  @HostBinding('style.z-index') get hostZIndex() {
    return this.isOpen() ? '99999' : 'auto';
  }

  @HostBinding('style.position') hostPosition = 'relative';

  currentLang = this.translationService.currentLang;

  // Options & Control Config
  @Input() options: any[] = [];
  @Input() valueKey = 'id';
  @Input() labelKey = 'name';
  @Input() labelEnKey = 'nameEn';
  @Input() labelArKey = 'nameAr';
  @Input() placeholder = '';
  @Input() clearable = false;
  @Input() searchable = false;
  @Input() allowUnset = false;
  @Input() unsetLabel = '';
  @Input() filePath = '';

  @Output() selectionChange = new EventEmitter<any>();

  isOpen = signal<boolean>(false);
  disabled = false;
  selectedValue: any = null;
  searchQuery = signal<string>('');

  onChange: any = () => {};
  onTouched: any = () => {};

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  get isSearchable(): boolean {
    return this.searchable || (this.options && this.options.length > 6);
  }

  filteredOptions = computed(() => {
    const list = this.options || [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;

    return list.filter(opt => {
      const label = this.getOptionLabel(opt).toLowerCase();
      return label.includes(query);
    });
  });

  get selectedOptionObj(): any {
    if (this.selectedValue === null || this.selectedValue === undefined || this.selectedValue === '') {
      return null;
    }
    if (!this.options || this.options.length === 0) {
      return null;
    }
    return this.options.find(opt => this.isOptionValueMatch(opt, this.selectedValue));
  }

  getSelectedLabel(): string {
    const opt = this.selectedOptionObj;
    if (opt) {
      return this.getOptionLabel(opt);
    }
    if (this.selectedValue !== null && this.selectedValue !== undefined && this.selectedValue !== '') {
      // If primitive option list e.g. ['EACH', 'KG']
      const primitiveMatch = this.options?.find(o => o === this.selectedValue);
      if (primitiveMatch) return String(primitiveMatch);
    }
    return this.placeholder || (this.currentLang() === 'en' ? '-- Select --' : '-- اختر --');
  }

  getOptionLabel(opt: any): string {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt);
    }
    const isAr = this.currentLang() === 'ar';
    if (isAr && (opt[this.labelArKey] || opt['name_ar'] || opt['nameAr'] || opt['attrKeyAr'])) {
      return opt[this.labelArKey] || opt['name_ar'] || opt['nameAr'] || opt['attrKeyAr'];
    }
    return (
      opt[this.labelEnKey] ||
      opt[this.labelKey] ||
      opt['name_en'] ||
      opt['nameEn'] ||
      opt['attrKeyEn'] ||
      opt['name'] ||
      opt['label'] ||
      String(opt[this.valueKey] ?? opt)
    );
  }

  getOptionImage(opt: any): string {
    if (!opt) return '';
    const img = opt.logoUrl || opt.logo_url || opt.logo || opt.image || opt.brandImage || opt.imageUrl || opt.storeLogoUrl || opt.storeLogo || (opt.store && (opt.store.logoUrl || opt.store.logo_url || opt.store.logo));
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('assets/')) {
      return img;
    }
    const base = this.filePath || environment.filePath || '';
    if (base.endsWith('/') && img.startsWith('/')) {
      return base + img.substring(1);
    }
    if (!base.endsWith('/') && !img.startsWith('/')) {
      return base + '/' + img;
    }
    return base + img;
  }

  isOptionValueMatch(opt: any, val: any): boolean {
    if (opt === val) return true;
    if (opt === null || opt === undefined) return false;
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt) === String(val);
    }
    const optVal = opt[this.valueKey] !== undefined ? opt[this.valueKey] : opt.id;
    return String(optVal) === String(val);
  }

  isOptionSelected(opt: any): boolean {
    return this.isOptionValueMatch(opt, this.selectedValue);
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.isOpen.set(true);
      this.searchQuery.set('');
      this.onTouched();
      this.cd.detectChanges();
    }
  }

  closeDropdown(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.searchQuery.set('');
      this.cd.detectChanges();
    }
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query || '');
  }

  clearSearch(event: Event): void {
    event.stopPropagation();
    this.searchQuery.set('');
  }

  selectOption(opt: any, event: Event): void {
    event.stopPropagation();
    let val: any = null;

    if (opt !== null && opt !== undefined) {
      if (typeof opt === 'string' || typeof opt === 'number') {
        val = opt;
      } else {
        val = opt[this.valueKey] !== undefined ? opt[this.valueKey] : (opt.id !== undefined ? opt.id : opt);
      }
    }

    this.selectedValue = val;
    this.onChange(val);
    this.selectionChange.emit(val);
    this.closeDropdown();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedValue = null;
    this.onChange(null);
    this.selectionChange.emit(null);
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.selectedValue = value;
    this.cd.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cd.detectChanges();
  }
}
