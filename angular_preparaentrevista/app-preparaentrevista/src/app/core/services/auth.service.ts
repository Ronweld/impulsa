import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  //private apiUrl = 'http://localhost:8001/api/auth';
  private apiUrl = environment.API_URL_PREPARA_ENTREVISTA + '/api/auth';

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/token/`, { username, password })
      .pipe(
        tap(tokens => {
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
        })
      );
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  refreshToken(refresh: string) {
    return this.http.post<any>(`${this.apiUrl}/token/refresh/`, { refresh })
      .pipe(
        tap(tokens => {
          localStorage.setItem('access_token', tokens.access);
        })
      );
  }

}
