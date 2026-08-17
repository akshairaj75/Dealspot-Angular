import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private apiUrl = environment.apiUrl + '/brands';
  private storageKey = 'dealspot_brands';

  constructor(private http: HttpClient) {}

  private getMockBrands(): any[] {
    const brands = localStorage.getItem(this.storageKey);
    if (!brands) {
      const defaultBrands = [
        { id: 1, nameEn: 'Samsung', nameAr: 'سامسونج', logoUrl: 'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=100&h=100&q=80', active: 1, sortOrder: 1 },
        { id: 2, nameEn: 'Apple', nameAr: 'آبل', logoUrl: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=100&h=100&q=80', active: 1, sortOrder: 2 },
        { id: 3, nameEn: 'Sony', nameAr: 'سوني', logoUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=100&h=100&q=80', active: 1, sortOrder: 3 },
        { id: 4, nameEn: 'Nike', nameAr: 'نايكي', logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&h=100&q=80', active: 1, sortOrder: 4 },
        { id: 5, nameEn: 'Adidas', nameAr: 'أديداس', logoUrl: 'https://images.unsplash.com/photo-1518002171953-a080ee81be25?auto=format&fit=crop&w=100&h=100&q=80', active: 0, sortOrder: 5 }
      ];
      localStorage.setItem(this.storageKey, JSON.stringify(defaultBrands));
      return defaultBrands;
    }
    return JSON.parse(brands);
  }

  private saveMockBrands(brands: any[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(brands));
  }

  getBrands(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-brands');
  }

  createBrand(payload: any): Observable<any> {
    return this.http.post(this.apiUrl + '/create', payload).pipe(
      catchError((error) => {
        console.warn('API /brands/create failed, falling back to localStorage:', error);
        const brands = this.getMockBrands();
        const newId = brands.length > 0 ? Math.max(...brands.map((b: any) => b.id)) + 1 : 1;
        const newBrand = {
          id: newId,
          nameEn: payload.nameEn || payload.name_en,
          nameAr: payload.nameAr || payload.name_ar,
          logoUrl: payload.logoUrl || payload.logo_url,
          active: payload.active !== undefined ? payload.active : 1,
          sortOrder: payload.sortOrder || 1
        };
        brands.push(newBrand);
        this.saveMockBrands(brands);
        return of(newBrand);
      })
    );
  }

  updateBrand(id: number, payload: any): Observable<any> {
    return this.http.put(this.apiUrl + '/edit/' + id, payload).pipe(
      catchError((error) => {
        console.warn(`API /brands/edit/${id} failed, falling back to localStorage:`, error);
        const brands = this.getMockBrands();
        const index = brands.findIndex((b: any) => b.id === id);
        if (index !== -1) {
          brands[index] = {
            ...brands[index],
            nameEn: payload.nameEn !== undefined ? payload.nameEn : (payload.name_en !== undefined ? payload.name_en : brands[index].nameEn),
            nameAr: payload.nameAr !== undefined ? payload.nameAr : (payload.name_ar !== undefined ? payload.name_ar : brands[index].nameAr),
            logoUrl: payload.logoUrl !== undefined ? payload.logoUrl : (payload.logo_url !== undefined ? payload.logo_url : brands[index].logoUrl),
            active: payload.active !== undefined ? payload.active : brands[index].active,
            sortOrder: payload.sortOrder !== undefined ? payload.sortOrder : brands[index].sortOrder
          };
          this.saveMockBrands(brands);
          return of(brands[index]);
        }
        return throwError(() => new Error('Brand not found'));
      })
    );
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete/' + id).pipe(
      catchError((error) => {
        console.warn(`API /brands/delete/${id} failed, falling back to localStorage:`, error);
        let brands = this.getMockBrands();
        brands = brands.filter((b: any) => b.id !== id);
        this.saveMockBrands(brands);
        return of({ success: true });
      })
    );
  }
}
