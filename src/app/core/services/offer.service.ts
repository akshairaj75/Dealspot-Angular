import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private apiUrl = environment.apiUrl + '/offers';

  constructor(private http: HttpClient) {}

  getAllOffers(storeId?: number, includeExpired?: boolean): Observable<any[]> {
    let url = this.apiUrl + '/fetch-all-offers';
    const params: string[] = [];
    if (storeId) {
      params.push('storeId=' + storeId);
    }
    if (includeExpired) {
      params.push('includeExpired=true');
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    return this.http.get<any[]>(url);
  }

  getOffers(cityId?: number): Observable<any[]> {
    return this.getAllOffers();
  }

  getPagedOffers(
    page: number = 0,
    size: number = 20,
    search: string = '',
    storeId: number | null = null,
    badgeType: string | null = null,
    active: boolean | null = null
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    if (storeId !== null && storeId !== undefined) {
      params = params.set('storeId', storeId.toString());
    }
    if (badgeType && badgeType !== 'ALL' && badgeType !== '') {
      params = params.set('badgeType', badgeType);
    }
    if (active !== null && active !== undefined) {
      params = params.set('active', active.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/paged`, { params });
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

  extendOffer(id: number | string, days: number = 7): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/extend?days=${days}`, {});
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

