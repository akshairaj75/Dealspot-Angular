import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = environment.apiUrl.replace('/dealspot', '') + '/coupons';

  constructor(private http: HttpClient) {}

  getAllCoupons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fetch-all`);
  }

  getCoupons(): Observable<any[]> {
    return this.getAllCoupons();
  }

  getCouponById(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/fetch/${id}`);
  }

  addCoupon(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-coupon`, payload);
  }

  createCoupon(payload: any): Observable<any> {
    return this.addCoupon(payload);
  }

  updateCoupon(id: number | string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update/${id}`, payload);
  }

  deleteCoupon(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`, { responseType: 'text' });
  }
}
