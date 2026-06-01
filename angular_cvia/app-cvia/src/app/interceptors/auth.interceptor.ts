import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../components/services/auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = localStorage.getItem('access_token');

  // Detectar endpoints públicos
  const isPublicEndpoint =
    req.url.includes('/api/get_csrf_token/') ||
    req.url.includes('/api/captcha/');

  // Consultar estado de login (valor actual del BehaviorSubject)
  const isLoggedIn = (auth as AuthService)['isLoggedInSubject'].getValue();

  // Solo adjuntar Bearer si está logueado y no es público
  const authReq = (isLoggedIn && !isPublicEndpoint && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  
  return next(authReq).pipe(
    catchError(error => {
      // Manejar tanto 403 como 401
      const isTokenError =
        (error.status === 403 && error.error?.code === "token_not_valid") ||
        error.status === 401 || error.status === 405 || error.status === 500;

      // Detecta token inválido
      if (isTokenError) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          return auth.refreshToken(refreshToken).pipe(
            switchMap((tokens: any) => {
              // Guardar nuevos tokens en localStorage
              if (tokens.access) {
                localStorage.setItem('access_token', tokens.access);
              }
              if (tokens.refresh) {
                localStorage.setItem('refresh_token', tokens.refresh);
              }

              // Reintentar la petición original con el nuevo access token
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${tokens.access}` }
              });
              return next(retryReq);
            }),
            catchError(err => {
              console.error("Error al refrescar token:", err);
              // Redirigir al login si el refresh también falla
              //window.location.href = '/login';
              return throwError(() => err);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
