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

  // Follow Store Operations
  toggleFollow(storeId: number): Observable<{ isFollowing: boolean; followersCount: number; message: string }> {
    return this.http.post<{ isFollowing: boolean; followersCount: number; message: string }>(
      `${this.apiUrl}/${storeId}/follow-toggle`,
      {}
    );
  }

  getMyFollowedStores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-followed`);
  }

  isFollowing(storeId: number): Observable<{ isFollowing: boolean }> {
    return this.http.get<{ isFollowing: boolean }>(`${this.apiUrl}/${storeId}/is-following`);
  }

  getFollowersCount(storeId: number): Observable<{ followersCount: number }> {
    return this.http.get<{ followersCount: number }>(`${this.apiUrl}/${storeId}/followers-count`);
  }
}

