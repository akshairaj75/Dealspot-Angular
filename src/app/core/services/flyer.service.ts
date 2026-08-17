import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FlyerService {
  private apiUrl = environment.apiUrl.replace('/dealspot', '') + '/flyers';

  constructor(private http: HttpClient) {}

  getAllFlyers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl + '/fetch-all-flyers');
  }

  getFlyerById(id: number | string): Observable<any> {
    return this.http.get<any>(this.apiUrl + '/fetch-flyer/' + id);
  }
}
