import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/auth';

  constructor(private http: HttpClient) { }

  userLogin(data: any) {
    return this.http.post(this.apiUrl + '/user/login', data);
  }

  userRegister(data: any) {
    return this.http.post(this.apiUrl + '/user/register', data);
  }

  adminLogin(data: any) {
    return this.http.post(this.apiUrl + '/admin/login', data);
  }
}
