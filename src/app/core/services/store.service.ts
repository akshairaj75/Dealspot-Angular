import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StoreService {

  private apiUrl = environment.apiUrl + '/stores';
  private branchApiUrl = environment.apiUrl + '/store-branches';

  constructor(private http: HttpClient) { }   

  getStores(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all-stores');
  }

  getStoreById(id: number): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/fetch-store/' + id);
  }

  getBranches(storeId: number): Observable<any[]> {
    return this.http.get<any[]>(this.branchApiUrl + '/store/' + storeId + '/branches');
  }

  createStore(payload: any): Observable<any> {
    return this.http.post(this.apiUrl + '/create', payload);
  }

  updateStore(id: number, payload: any): Observable<any> {
    return this.http.put(this.apiUrl + '/update-store/' + id, payload);
  }

  deleteStore(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete-store/' + id);
  }
}
