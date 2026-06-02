import { environment } from '../../../../environments/environment';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';   // 👈 importa CommonModule
import { ApiService } from '../../../core/services/api.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SessionService } from '../../../core/services/session.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';   // 👈 importar Router

@Component({
  selector: 'app-jd-upload',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './jd-upload.component.html'
})
export class JDUploadComponent {

  selectedMethod: 'text' | 'url' | 'pdf' = 'text';
  textContent = '';
  url = '';
  file: File | null = null;
  //pdfUrl: string | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  title = '';
  isLoading = false;

  constructor(private api: ApiService, 
              private http: HttpClient, 
              private sanitizer: DomSanitizer,
              private sessionService: SessionService,
              private router: Router) {}

  // app.component.ts o en un servicio de inicialización de App2
  ngOnInit(): void {
    console.log("Ingresando al componente jd-upload...");

    window.addEventListener('beforeunload', () => {
      this.cerrar();
    });

    const origen_app = localStorage.getItem('origen_app');
    console.log(" origen_app origen_app ::::: ",origen_app);
    if (origen_app === null) {
      console.log(" origen_app origen_app 22222::::: ",origen_app);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("idioma_respuesta");

      window.addEventListener('message', (event: MessageEvent) => {
        // Seguridad: valida que el mensaje venga de App1
        //if (event.origin === 'http://localhost:4200' && event.data?.token) {
        console.log(" EO EO ::: ", event.origin);
        console.log(" environment.APP_URL_CVIA ::: ", environment.APP_URL_CVIA);
        console.log(" event.data?.token ::: ", event.data?.token);
        if (event.origin === environment.APP_URL_CVIA && event.data?.token) {
          // Guarda el token en localStorage de App2
          localStorage.setItem('access_token', event.data.token);

          // Opcional: si también envías refresh_token
          if (event.data.refresh) {
            localStorage.setItem('refresh_token', event.data.refresh);
          }

          if (event.data.username) {
            localStorage.setItem('username', event.data.username);
            console.log("Usuario recibido:", event.data.username);
            this.registerUser(event.data.username);
          }

          if (event.data.origen_app) {
            localStorage.setItem('origen_app', event.data.origen_app);
            console.log("Nombre de aplicación origen:", event.data.origen_app);
          }

          if (event.data.idioma_respuesta) {
            localStorage.setItem('idioma_respuesta', event.data.idioma_respuesta);
            console.log("Idioma respuesta que espera el cliente:", event.data.idioma_respuesta);
          }
        }
      });
    }
  }

  cerrar(): void {

      if (window.self !== window.top) {
        localStorage.removeItem('origen_app');
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("idioma_respuesta");
      } else {
        this.router.navigate(['/login']);
      }
  }

  onFileChange_ant(event: any) {
    this.file = event.target.files[0];
    if (this.file) {
      this.pdfUrl = URL.createObjectURL(this.file);
    }
  }

  onFileChange(event: any) {
    this.file = event.target.files[0];
    if (this.file) {
      const objectUrl = URL.createObjectURL(this.file);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl); // 👈 marcar como seguro
    }
  }

  fetchFromUrl() {
    if (!this.url.trim()) {
      alert('Debes ingresar una URL válida.');
      return;
    }

    // Ejemplo: el backend Django expone un endpoint que recibe la URL y devuelve el texto extraído
    this.api.post('/jobdescriptions/extract_from_url/', { url: this.url }).subscribe({
      next: (res: any) => {
        this.textContent = res.text_content;
      },
      error: (err) => {
        console.error(err);
        alert('Error al extraer el Job Description desde la URL.');
      }
    });
  }

  uploadJobDescription() {
    document.body.style.cursor = "wait";
    this.isLoading = true;  // 👈 activar icono de carga
    const formData = new FormData();
    
    if (this.title.trim()) {
      formData.append('title', this.title);
    }

    const app_name = localStorage.getItem('origen_app')!;
    if (app_name === null){
      formData.append('app_name', app_name);
    }

    if (this.selectedMethod === 'text' && this.textContent.trim()) {
      formData.append('text_content', this.textContent);
    } else if (this.selectedMethod === 'url' && this.url.trim()) {
      formData.append('url', this.url);
      if (this.textContent.trim()) {
        formData.append('text_content', this.textContent);
      }
    } else if (this.selectedMethod === 'pdf' && this.file) {
      formData.append('pdf_file', this.file);
    } else {
      alert('Debes ingresar un valor válido según el método seleccionado.');
      this.isLoading = false;
      return;
    }

    this.api.post('/jobdescriptions/', formData).subscribe({
      next: (jd: any) => {
        localStorage.setItem('jd_id', jd.id);
        
        this.sessionService.createSession({ jd: jd.id }).subscribe({
          next: (res: any) => {
            console.log('Sesión creada:', res);
            localStorage.setItem('session_id', String(res.session_id));
            //window.location.href = '/chat';
            this.router.navigate(['/chat']);
            this.isLoading = false;  // 👈 desactivar icono
            document.body.style.cursor = "auto";
          },
          error: (err) => {
            console.error('Error al crear la sesión:', err);
            alert('Ocurrió un error al crear la sesión. Intenta nuevamente.');
            this.isLoading = false;  // 👈 desactivar icono
            document.body.style.cursor = "auto";
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert('Error al cargar el Job Description.');
        this.isLoading = false;  // 👈 desactivar icono
        document.body.style.cursor = "auto";
      }
    });
  }

registerUser(username: string): Observable<boolean> {
    const formData = new FormData();
    
    formData.append('username', username);
    console.log("Usuario para registrar:: ",username);
    this.api.post('/users/public/', formData).subscribe((res: any) => {
        if (res.message === "Existe") {
          console.log("Confirmación:", res.username);
        } else if (res.message === "Creado") {
          console.log("Nuevo usuario:", res.username);
        }
        return true;
      },
      catchError(err => {
        console.error("Error en registerUser:", err);
        return of(false);
      })
      )
      return of(false);
    }

}
