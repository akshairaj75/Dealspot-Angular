import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class StoreService {

  private apiUrl = environment.apiUrl + '/stores';
  constructor(private http: HttpClient) { }   

  getStores() {
    return this.http.get<any>(this.apiUrl + '/fetch-all-stores');
  }

  createStore(payload: any) {
    return this.http.post(this.apiUrl + '/create', payload);
  }

  updateStore(id: number, payload: any) {
    return this.http.put(this.apiUrl + '/update-store/' + id, payload);
  }

  deleteStore(id: number) {
    return this.http.delete(this.apiUrl + '/delete/' + id);
  }
}
