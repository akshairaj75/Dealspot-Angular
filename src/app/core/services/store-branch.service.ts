import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StoreBranchService {
  private apiUrl = environment.apiUrl + '/store-branches';

  constructor(private http: HttpClient) {}

  getBranchesByStoreId(storeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/store/${storeId}/branches`);
  }

  addBranch(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/store/add-branch`, payload);
  }

  updateBranch(branchId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update/${branchId}`, payload);
  }

  deleteBranch(branchId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${branchId}`, { responseType: 'text' });
  }
}
