import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  get(url: string) {
    return this.http.get(`${environment.API_URL_PREPARA_ENTREVISTA}${url}`);
  }

  post(url: string, data: any) {
    return this.http.post(`${environment.API_URL_PREPARA_ENTREVISTA}${url}`, data);
  }
}