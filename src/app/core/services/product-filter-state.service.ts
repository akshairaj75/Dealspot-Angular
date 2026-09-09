import { Injectable, signal } from '@angular/core';

export interface ProductCatalogState {
  searchQuery: string;
  filterMainCategoryId: number | null;
  filterSubCategoryId: number | null;
  filterSubcategories: any[];
  filterCategoryId: number | null;
  filterBrandId: number | null;
  products: any[];
  currentPage: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
  scrollY: number;
  lastViewedProductId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductFilterStateService {
  private savedState = signal<ProductCatalogState | null>(null);

  hasState(): boolean {
    return this.savedState() !== null;
  }

  getState(): ProductCatalogState | null {
    return this.savedState();
  }

  saveState(state: ProductCatalogState): void {
    this.savedState.set(state);
  }

  clearState(): void {
    this.savedState.set(null);
  }
}
