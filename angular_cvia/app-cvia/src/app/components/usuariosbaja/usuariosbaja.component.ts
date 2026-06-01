import { Component } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { CaptchaService } from '../services/captcha.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject, lastValueFrom } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-usuariosbaja',
  standalone: true, // <-- ¡Importante! Asegúrate de que sea standalone
  templateUrl: './usuariosbaja.component.html',
  styleUrls: ['./usuariosbaja.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule]  // Importa FormsModule aquí  
})

export class UsuariosBajaComponent {
  usuarioData = {
    nombre_usuario: '',
    email1: '',
    email2: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombres: '',
    celular: '',
    direccion: '',
    tipo_documento_identidad: '',
    numero_documento_identidad: '',
  };

  private destroy$ = new Subject<void>();

  captchaInput = new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
  captchaImageUrl: SafeUrl | null = null;
  validationMessage: string = '';
  validationSuccess: boolean | null = null; // true for success, false for error
  csrfToken: string | null = null;
  mostrarFormulario: boolean = false;
  errores: string[] = [];
  
  constructor(
    private sanitizer: DomSanitizer,
    private usuarioService: UsuarioService, 
    private captchaService: CaptchaService,
    private authService: AuthService) {}

  ngOnInit() {
    this.loadCsrfTokenAndCaptcha();
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente

    this.usuarioService.darBajaSeleccionado$.subscribe(nombreUsuario => {
      if (nombreUsuario) {
        this.visualizarUsuario(nombreUsuario); // ← Llama al método automáticamente
      }
    });
    
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga el token CSRF y luego genera el CAPTCHA.
   */
  loadCsrfTokenAndCaptcha(): void {
    this.captchaService.getCsrfToken()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.csrfToken = response.csrfToken;
          console.log('CSRF Token obtained:', this.csrfToken);
          this.generateCaptcha();
        },
        error: (error) => {
          console.error('Error getting CSRF token:', error);
          this.validationMessage = 'Error al cargar el token de seguridad.';
          this.validationSuccess = false;
        }
      });
  }

  /**
   * Valida el CAPTCHA ingresado por el usuario.
   */
  async validateCaptcha(): Promise<boolean> {
    if (this.captchaInput.invalid) {
      this.validationMessage = 'Por favor, introduce 6 caracteres alfanuméricos.';
      this.validationSuccess = false;
      return false;
    }

    if (!this.csrfToken) {
      this.validationMessage = 'Error: Token CSRF no disponible. Recargue la página.';
      this.validationSuccess = false;
      return false;
    }

    const userCaptcha = this.captchaInput.value!;

    try {
      const response = await lastValueFrom(this.captchaService.validateCaptcha(userCaptcha, this.csrfToken));
      
      if (response?.success) {
        this.validationMessage = response.success;
        this.validationSuccess = true;
        return true;
      } else {
        this.validationMessage = response?.error || 'Error de validación desconocido.';
        this.validationSuccess = false;
        return false;
      }
    } catch (error) {
      console.error('Error al validar CAPTCHA:', error);
      this.validationMessage = 'Error al validar CAPTCHA.';
      this.validationSuccess = false;
      return false;
    }
  }
/*
  async actualizarUsuario() {
    if (await this.validarUsuario()){
      this.usuarioService.darDeBajaUsuario(this.usuarioData).subscribe((res:any) => console.log(res));
      this.closeUsuario();
    }
  }
*/
  async darDeBajaUsuario() {
    if (await this.validarUsuario()){
    this.usuarioService.darDeBajaUsuario(this.usuarioData.nombre_usuario).subscribe((res:any) => console.log(res));
      this.closeUsuario();
    }
  }

  visualizarUsuario(userName : string) {
    this.usuarioService.visualizarUsuario(userName)
    .subscribe(
      response => {
        this.usuarioData = response;
      },
      error => {
        console.error('Error al obtener usuario:', error);
      }
    );
  }

  closeUsuario() {
    this.usuarioService.closeSeleccionarDarBaja(); // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
  }

  async validarUsuario(): Promise<boolean>{
    this.errores = []; // 🔥 Reiniciar errores antes de validar

    const { nombre_usuario  } = this.usuarioData;

    // 📌 Validación: Nombre de usuario (Solo letras, números y guión bajo)
    const nombreUsuarioRegex = /^[a-zA-Z0-9_]+$/;
    if (!nombreUsuarioRegex.test(nombre_usuario)) {
      this.errores.push("El nombre de usuario solo puede contener letras, números y guión bajo.");
    }

    // 📌 Si no hay errores, validamos el captcha()
    if (this.errores.length === 0) {
      const captcha = await this.validateCaptcha();
      if (!captcha){
        this.errores.push("Error en captcha");
      }
      return captcha;
    }

    return this.errores.length === 0; // ✅ Retorna `true` si no hay errores
  }

/**
   * Genera una nueva imagen CAPTCHA.
   */
  generateCaptcha(): void {
    this.captchaService.getCaptcha()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (imageBlob) => {
          // Crea una URL segura para la imagen Blob
          this.captchaImageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(imageBlob));
          this.validationMessage = ''; // Limpia mensajes anteriores
          this.validationSuccess = null;
          this.captchaInput.reset(); // Resetea el input del CAPTCHA
        },
        error: (error) => {
          console.error('Error generating CAPTCHA:', error);
          this.validationMessage = 'Error al generar la imagen CAPTCHA.';
          this.validationSuccess = false;
        }
      });
  }

}
