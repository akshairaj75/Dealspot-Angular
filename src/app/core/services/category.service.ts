import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {

  private apiUrl = environment.apiUrl + '/categories';

  constructor(private http: HttpClient) {}

  getCategories() {
    return this.http.get<any>(this.apiUrl + '/fetch-categories');
  }

  createCategory(payload: any) {
    return this.http.post(this.apiUrl+'/create', payload);
  }

  updateCategory(id: number, payload: any) {
    return this.http.put(this.apiUrl+ '/edit/' + id, payload);
  }

  deleteCategory(id: number) {
    return this.http.delete(this.apiUrl+ '/delete/' + id);
  }
}
