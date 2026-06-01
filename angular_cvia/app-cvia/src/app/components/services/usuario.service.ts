import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class UsuarioService {
  private apiUrl = `${environment.API_URL}/usuarios/`; 
  private showUsuarioSubject = new BehaviorSubject<boolean>(false); // ✅ Estado inicial: oculto
  showUsuario$ = this.showUsuarioSubject.asObservable(); // ✅ Observable para suscribirse

  private usuarioSeleccionadoSubject = new BehaviorSubject<string>(''); // ← Guarda el usuario seleccionado
  usuarioSeleccionado$ = this.usuarioSeleccionadoSubject.asObservable();

  private cambioPasswordSubject = new BehaviorSubject<string>(''); // ← Guarda el usuario seleccionado
  cambioPassword$ = this.cambioPasswordSubject.asObservable();

  private darBajaSeleccionadoSubject = new BehaviorSubject<string>(''); // ← Guarda el usuario seleccionado
  darBajaSeleccionado$ = this.darBajaSeleccionadoSubject.asObservable();


  constructor(private http: HttpClient    ) {
    this.loadCsrfToken();
  }

  private csrfToken: string = '';
  private csrf_tokenUrl = `${environment.API_URL}/api/get_csrf_token/`; 

  private loadCsrfToken(): void {
    this.http.get<{ csrfToken: string }>(`${this.csrf_tokenUrl}`, { withCredentials: true })
      .subscribe(response => {
        this.csrfToken = response.csrfToken;
        document.cookie = `csrftoken=${this.csrfToken}; path=/`;
      });
  }

  agregarUsuario(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}agregar/`, data, this.getHttpOptions());
  }

  actualizarUsuario(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}actualizar/`, data, this.getHttpOptions());
  }

  actualizarContraseña(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}cambiar_contrasena/`, data, this.getHttpOptions());
  }

  bloquearUsuario(nombre_usuario: string): Observable<any> {
    return this.http.put(`${this.apiUrl}bloquear/`, { nombre_usuario }, this.getHttpOptions());
  }

  suspenderUsuario(nombre_usuario: string): Observable<any> {
    return this.http.put(`${this.apiUrl}suspender/`, { nombre_usuario }, this.getHttpOptions());
  }

  darDeBajaUsuario(nombre_usuario: string): Observable<any> {
    return this.http.put(`${this.apiUrl}dar_de_baja/`, { nombre_usuario }, this.getHttpOptions());
  }

  visualizarUsuario(nombre_usuario: string): Observable<any> {
    return this.http.get(`${this.apiUrl}visualizar/${nombre_usuario}/`, this.getHttpOptions());
  }

  openUsuario() {
    console.log("🔹 Se activó Usuario"); // ✅ Verificar que se ejecuta
    this.showUsuarioSubject.next(true); // ✅ Muestra el LoginComponent
  }

  closeUsuario() {
    console.log("🔹 Se cerró Login"); // ✅ Verificar que se ejecuta  
    this.showUsuarioSubject.next(false); // ✅ Oculta el LoginComponent
  }

  seleccionarUsuario(nombreUsuario: string) {
    this.usuarioSeleccionadoSubject.next(nombreUsuario); // ← Cambia el usuario seleccionado
  }

  closeSeleccionarUsuario() {
    console.log("🔹 Se cerró Login"); // ✅ Verificar que se ejecuta  
    this.usuarioSeleccionadoSubject.next(''); // ✅ Oculta el LoginComponent
  }

  seleccionarCambiaPassword(nombreUsuario: string) {
    this.cambioPasswordSubject.next(nombreUsuario); // ← Cambia el usuario seleccionado
  }

  closePassword() {
    console.log("🔹 Se cerró cambio passwor"); // ✅ Verificar que se ejecuta  
    this.cambioPasswordSubject.next(''); // ✅ Oculta el LoginComponent
  }

  seleccionarDarBaja(nombreUsuario: string) {
    this.darBajaSeleccionadoSubject.next(nombreUsuario); // ← Cambia el usuario seleccionado
  }

  closeSeleccionarDarBaja() {
    console.log("🔹 Se cerró dar  baja"); // ✅ Verificar que se ejecuta  
    this.darBajaSeleccionadoSubject.next(''); // ✅ Oculta el LoginComponent
  }

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'X-CSRFToken': this.csrfToken
      })
    };
  }

}
