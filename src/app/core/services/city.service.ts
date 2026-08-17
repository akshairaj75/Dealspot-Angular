import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CityService {

  private apiUrl = environment.apiUrl + '/cities';

  constructor(private http: HttpClient) {}

  getCities() {
    return this.http.get<any>(this.apiUrl+'/fetch-all');
  }

  createCity(city: any) {
    return this.http.post(this.apiUrl, city);
  }

  updateCity(city: any) {
    return this.http.put(this.apiUrl + '/' + city.id, city);
  }

  deleteCity(id: number) {
    return this.http.delete(this.apiUrl + '/delete/' + id);
  }

}
