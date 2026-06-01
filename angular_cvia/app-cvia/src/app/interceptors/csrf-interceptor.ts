import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
    console.log("Interceptor CSRF csrfToken:: ",csrfToken);
    const clonedReq = req.clone({
      headers: req.headers.set('X-CSRFToken', csrfToken)
    });

    return next.handle(clonedReq);
  }
}
