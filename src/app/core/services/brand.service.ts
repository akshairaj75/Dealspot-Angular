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

  constructor(private http: HttpClient) {}

  getBrands(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-brands');
  }

  getBrand(id: number): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/' + id);
  }

  searchBrands(query: string = '', page: number = 0, size: number = 20): Observable<any> {
    let params: any = { page, size };
    if (query && query.trim() !== '') {
      params.q = query.trim();
    }
    return this.http.get<any>(this.apiUrl + '/search', { params });
  }

  createBrand(payload: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/register-brand', payload);
  }

  updateBrand(id: number, payload: FormData): Observable<any> {
    return this.http.patch<any>(this.apiUrl + '/update-brand/' + id, payload);
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete-brand/' + id, { responseType: 'text' });
  }
}
