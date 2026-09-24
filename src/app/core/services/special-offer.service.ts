import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

export interface SpecialOfferItem {
  id: number;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  storeId?: number;
  storeNameEn?: string;
  storeNameAr?: string;
  storeLogoUrl?: string;
  cityId?: number;
  cityNameEn?: string;
  cityNameAr?: string;
  badgeText?: string;
  validFrom: string;
  validUntil: string;
  featured: boolean;
  active: boolean;
  expired: boolean;
  upcoming: boolean;
  status: string;
  daysRemaining: number;
  viewCount: number;
  totalOffersCount: number;
  offers?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OfferPeriodSplitRequest {
  existingOfferId: number;
  specialOfferId?: number | null;
  newOfferPrice: number;
  newOriginalPrice?: number | null;
  splitValidFrom: string;
  splitValidUntil: string;
  titleEn?: string;
  titleAr?: string;
  badgeType?: string;
  displayOrder?: number;
}

export interface OfferConflictResponse {
  status: number;
  error: string;
  message: string;
  conflictingOfferId?: number;
  conflictingOfferTitle?: string;
  offerPrice?: number;
  originalPrice?: number;
  validFrom?: string;
  validUntil?: string;
  productId?: number;
  storeId?: number;
  specialOfferId?: number;
  specialOfferTitle?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpecialOfferService {
  private apiUrl = environment.apiUrl + '/special-offers';

  constructor(private http: HttpClient) {}

  getActiveSpecialOffers(storeId?: number, cityId?: number): Observable<SpecialOfferItem[]> {
    let params = new HttpParams();
    if (storeId) {
      params = params.set('storeId', storeId.toString());
    }
    if (cityId) {
      params = params.set('cityId', cityId.toString());
    }
    return this.http.get<SpecialOfferItem[]>(`${this.apiUrl}/fetch-all`, { params });
  }

  getSpecialOfferById(id: number | string): Observable<SpecialOfferItem> {
    return this.http.get<SpecialOfferItem>(`${this.apiUrl}/fetch/${id}`);
  }

  getPagedSpecialOffers(
    page: number = 0,
    size: number = 10,
    search: string = '',
    storeId: number | null = null,
    status: string | null = null,
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
    if (status && status !== 'ALL' && status !== '') {
      params = params.set('status', status);
    }
    if (active !== null && active !== undefined) {
      params = params.set('active', active.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/paged`, { params });
  }

  createSpecialOfferMultipart(formData: FormData): Observable<SpecialOfferItem> {
    return this.http.post<SpecialOfferItem>(`${this.apiUrl}/create`, formData);
  }

  createSpecialOfferJson(data: any): Observable<SpecialOfferItem> {
    return this.http.post<SpecialOfferItem>(`${this.apiUrl}/create`, data);
  }

  updateSpecialOfferMultipart(id: number | string, formData: FormData): Observable<SpecialOfferItem> {
    return this.http.put<SpecialOfferItem>(`${this.apiUrl}/update/${id}`, formData);
  }

  updateSpecialOfferJson(id: number | string, data: any): Observable<SpecialOfferItem> {
    return this.http.put<SpecialOfferItem>(`${this.apiUrl}/update/${id}`, data);
  }

  deleteSpecialOffer(id: number | string): Observable<string> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`, { responseType: 'text' });
  }

  attachDeals(specialOfferId: number | string, offerIds: number[]): Observable<SpecialOfferItem> {
    return this.http.post<SpecialOfferItem>(`${this.apiUrl}/${specialOfferId}/attach-deals`, offerIds);
  }

  removeDeal(specialOfferId: number | string, offerId: number | string): Observable<SpecialOfferItem> {
    return this.http.delete<SpecialOfferItem>(`${this.apiUrl}/${specialOfferId}/remove-deal/${offerId}`);
  }

  splitOfferPrice(specialOfferId: number | string, data: OfferPeriodSplitRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${specialOfferId}/split-offer-price`, data);
  }
}
