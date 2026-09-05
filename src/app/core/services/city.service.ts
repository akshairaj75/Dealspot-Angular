import { Injectable, signal } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CityService {

  private apiUrl = environment.apiUrl + '/cities';

  private readonly STORAGE_KEY = 'dealspot_selected_city';

  selectedCity = signal<any>(this.getInitialCity());

  constructor(private http: HttpClient) {}

  private getInitialCity(): any {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved city from localStorage', e);
    }
    return {
      id: 1,
      nameEn: 'Riyadh',
      nameAr: 'الرياض'
    };
  }

  setSelectedCity(city: any): void {
    if (!city) return;
    this.selectedCity.set(city);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(city));
    } catch (e) {
      console.warn('Failed to save city to localStorage', e);
    }
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
