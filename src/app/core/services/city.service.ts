import { Injectable, signal } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CityService {

  private apiUrl = environment.apiUrl + '/cities';

  selectedCity = signal<any>({
    id: 1,
    nameEn: 'Riyadh',
    nameAr: 'الرياض'
  });

  constructor(private http: HttpClient) {}

  setSelectedCity(city: any): void {
    this.selectedCity.set(city);
  }

  getCities(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all');
  }

  createCity(city: any): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/create', city);
  }

  updateCity(id: number, city: any): Observable<any> {
    return this.http.put<any>(this.apiUrl + '/edit/' + id, city);
  }

  deleteCity(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + '/delete/' + id, { responseType: 'text' });
  }

}
