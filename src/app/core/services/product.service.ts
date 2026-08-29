import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})

export class ProductService {
  private apiUrl = environment.apiUrl + '/products';
  constructor(private http: HttpClient) { }

  getProducts() {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all-products');
  }

  getPagedProducts(
    page: number = 0,
    size: number = 20,
    search?: string,
    categoryId?: number | null,
    brandId?: number | null,
    sortBy: string = 'createdAt',
    direction: string = 'desc'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('direction', direction);

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (categoryId !== undefined && categoryId !== null && categoryId !== ('' as any)) {
      params = params.set('categoryId', categoryId.toString());
    }
    if (brandId !== undefined && brandId !== null && brandId !== ('' as any)) {
      params = params.set('brandId', brandId.toString());
    }

    return this.http.get<any>(this.apiUrl + '/paged', { params });
  }
  getProductsById(id: string | number) {
    return this.http.get<any>(this.apiUrl + '/fetch-product/' + id);
  }

  getProductById(id: number | string) {
    return this.http.get<any>(this.apiUrl + '/fetch-product/' + id);
  }

  addProduct(body: any) {
    return this.http.post<any>(this.apiUrl + '/add-product', body);
  }

  updateProduct(productId: number, body: any) {
    return this.http.put<any>(this.apiUrl + '/update-product/' + productId, body);
  }

  deleteProduct(id: number) {
    return this.http.delete<any>(this.apiUrl + '/delete-product/' + id);
  }

  getProductSpecs(id: number | string) {
    return this.http.get<any[]>(this.apiUrl + '/get-product-details/' + id);
  }

  fetchAttributeKeys(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-attribute-keys');
  }

  addAttributeKey(body: { attrKeyEn: string; attrKeyAr: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/add-key', body);
  }
}
