// src/app/services/session.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  //private apiUrl = 'http://localhost:8001/sessions';
  private apiUrl = environment.API_URL_PREPARA_ENTREVISTA +'/sessions';

  constructor(private http: HttpClient) {}

  createSession(data: any) {
    return this.http.post(`${this.apiUrl}/`, data);
  }

  getActiveSession() {
    return this.http.get(`${this.apiUrl}/active/`);
  }

  getSessions() {
    return this.http.get(`${this.apiUrl}/`);
  }

  getSessionById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}/`);
  }
}
