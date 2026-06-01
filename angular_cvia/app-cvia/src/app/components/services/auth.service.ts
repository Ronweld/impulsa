import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private showLoginSubject = new BehaviorSubject<boolean>(false); // ✅ Estado inicial: oculto
  showLogin$ = this.showLoginSubject.asObservable(); // ✅ Observable para suscribirse

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private apiUrl = `${environment.API_URL}/usuarios/`; 
  private apiUrlAuth = `${environment.API_URL}/api/auth/`; 

  constructor(private http: HttpClient) {
    if (typeof window !== 'undefined') { // ✅ Verificar si window está disponible
      this.isLoggedInSubject.next(!!sessionStorage.getItem('access_token'));
    }
  }

  login_ant(username: string, password: string ) {
    const data = { 'username': username, 'password': password };
    return this.http.post<{ resultado: string }>(`${this.apiUrl}validar-login/`, data);
  }

  login(username: string, password: string) {
    
    return this.http.post<any>(`${this.apiUrlAuth}token/`, { username, password }).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
      })
    );
  }

  refreshToken(refresh: string) {
    return this.http.post<any>(`${this.apiUrlAuth}token/refresh/`, { refresh }).pipe(
      tap(tokens => {
        localStorage.setItem('access_token', tokens.access);
        if (tokens.refresh) {
          localStorage.setItem('refresh_token', tokens.refresh);
        }
      })
    );
  }

  validarUsuario(nombre_usuario: string, password: string): Observable<{ resultado: boolean; mensaje?: string }> {
    return this.http.post<{ resultado: boolean; mensaje?: string }>(`${this.apiUrl}validar-login/`, { nombre_usuario, password })
  }

  // Método para actualizar el estado de autenticación
  setLoginStatus(isLoggedIn: boolean): void {
    this.isLoggedInSubject.next(isLoggedIn);
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.isLoggedInSubject.next(false);
  }

  openLogin() {
    this.showLoginSubject.next(true); // ✅ Muestra el LoginComponent
  }

  closeLogin() {
    this.showLoginSubject.next(false); // ✅ Oculta el LoginComponent
  }
  
}
