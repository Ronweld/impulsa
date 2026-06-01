import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})

export class PreparaentrevistaService {

  //private baseUrl = 'http://localhost:8001/api'; // API de App2
  private apiUrl = `${environment.API_URL_PREPARA_ENTREVISTA}/sessions`; 

  constructor(private http: HttpClient) {}

  getPreparaEntrevista(data: any) {
    console.log("datatattatat ",data);
    return this.http.post(`${this.apiUrl}/`, data);
  }

}
