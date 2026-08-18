import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FlyerService {
  private apiUrl = environment.apiUrl.replace('/dealspot', '') + '/flyers';

  constructor(private http: HttpClient) {}

  getAllFlyers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all-flyers');
  }

  getFlyers(cityId?: number): Observable<any[]> {
    return this.getAllFlyers();
  }

  getFlyerById(id: number | string): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/fetch-flyer/' + id);
  }

  addFlyer(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/add', formData);
  }

  updateFlyer(id: number, formData: FormData): Observable<any> {
    return this.http.put<any>(this.apiUrl + '/update/' + id, formData);
  }

  deleteFlyer(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete/' + id, { responseType: 'text' });
  }

  // Flyer Pages CRUD
  getFlyerPages(flyerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${flyerId}/pages`);
  }

  addFlyerPage(flyerId: number, formData: FormData, pageNumber?: number): Observable<any> {
    let params = new HttpParams();
    if (pageNumber) {
      params = params.set('pageNumber', pageNumber.toString());
    }
    return this.http.post<any>(`${this.apiUrl}/${flyerId}/pages/add`, formData, { params });
  }

  updateFlyerPage(pageId: number, formData: FormData, pageNumber?: number): Observable<any> {
    let params = new HttpParams();
    if (pageNumber) {
      params = params.set('pageNumber', pageNumber.toString());
    }
    return this.http.put<any>(`${this.apiUrl}/pages/${pageId}`, formData, { params });
  }

  deleteFlyerPage(pageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pages/${pageId}`, { responseType: 'text' });
  }
}
