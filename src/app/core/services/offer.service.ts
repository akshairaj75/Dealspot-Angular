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

  getAllOffers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all-offers');
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
}
