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

  getOfferById(id: number | string): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/fetch-offer/' + id);
  }
}
