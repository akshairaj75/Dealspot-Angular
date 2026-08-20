import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private apiUrl = environment.apiUrl + '/offers';

  constructor(private http: HttpClient) {}

  getAllOffers(storeId?: number): Observable<any[]> {
    let url = this.apiUrl + '/fetch-all-offers';
    if (storeId) {
      url += '?storeId=' + storeId;
    }
    return this.http.get<any[]>(url);
  }

  getOffers(cityId?: number): Observable<any[]> {
    return this.getAllOffers();
  }


  getOfferById(id: number | string): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/fetch-offer/' + id);
  }

  createOffer(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/create', data);
  }

  updateOffer(id: number | string, data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + '/update/' + id, data);
  }

  deleteOffer(id: number | string): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete/' + id, { responseType: 'text' });
  }

  // Saved / Bookmark Operations
  toggleSaveOffer(offerId: number | string): Observable<{ isSaved: boolean; saveCount: number; message: string }> {
    return this.http.post<{ isSaved: boolean; saveCount: number; message: string }>(
      `${this.apiUrl}/${offerId}/save-toggle`,
      {}
    );
  }

  getMySavedOffers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-saved`);
  }

  isOfferSaved(offerId: number | string): Observable<{ isSaved: boolean }> {
    return this.http.get<{ isSaved: boolean }>(`${this.apiUrl}/${offerId}/is-saved`);
  }
}

