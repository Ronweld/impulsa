import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CaptchaService {
  private csrf_tokenUrl = `${environment.API_URL}/api/get_csrf_token/`; 
  private captchaValidateUrl = `${environment.API_URL}/api/validate/`; 
  private captchaUrl = `${environment.API_URL}/api/captcha/`; 

  constructor(private http: HttpClient) {
        //console.log("cpatcha=== >", `${environment.API_URL}`, this.captchaUrl);
  }

  /**
   * Genera y devuelve la imagen CAPTCHA como un Blob.
   */
  getCaptcha(): Observable<Blob> {

    return this.http.get(`${this.captchaUrl}`, { 
      responseType: 'blob' ,
      withCredentials: true // <-- AÑADIR ESTO
    }).pipe(
      tap((response: any) => {
        // Opcional: Puedes loguear la respuesta si es necesario para depuración.
        // console.log('Captcha image generated:', response);
      })
    );
  }

  getCsrfToken(): Observable<{ csrfToken: string }> {
    return this.http.get<{ csrfToken: string }>(`${this.csrf_tokenUrl}`, { withCredentials: true });
  }

  /**
   * Valida el CAPTCHA ingresado por el usuario.
   * @param captchaText El texto del CAPTCHA ingresado por el usuario.
   * @param csrfToken El token CSRF obtenido previamente.
   */
  validateCaptcha(captchaText: string, csrfToken: string): Observable<{ success?: string; error?: string }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken // ¡Envía el token CSRF en el encabezado!
    });
    return this.http.post<{ success?: string; error?: string }>(`${this.captchaValidateUrl}`, { captcha: captchaText }, { 
      headers,
      withCredentials: true // <-- AÑADIR ESTO
    });
  }
}
