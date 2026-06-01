import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common'; // ✅ Importar CommonModule
import { AuthService } from '../services/auth.service';
import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild } from '@angular/core';
import { CaptchaService } from '../services/captcha.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormControl, Validators, ReactiveFormsModule  } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { UsuarioService } from '../services/usuario.service';
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 

@Component({
  selector: 'app-login',
  standalone: true, // <-- ¡Importante! Asegúrate de que sea standalone
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [CommonModule, ReactiveFormsModule  ]
})

export class LoginComponent implements OnInit, OnDestroy {
  @Output() userLoggedIn = new EventEmitter<void>(); // Evento para comunicar el login exitoso

  TAMAÑO_PERMITIDO: number=0; 
  isLoggedIn: boolean = false;
  captchaImageUrl: SafeUrl | null = null;
  captchaInput = new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
  validationMessage: string = '';
  validationSuccess: boolean | null = null; // true for success, false for error
  csrfToken: string | null = null;

  username: string = '';
  password: string = '';
  //errorMessage: string = '';
  mostrarPassword: boolean = false;
  mostrarFormulario: boolean = false;
  errores: string[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private captchaService: CaptchaService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private cv_Service: CV_Service,
  ) { }

  ngOnInit(): void {
    this.loadCsrfTokenAndCaptcha();
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente
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

  onUsernameChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.username = inputElement.value;
  }

  onPasswordChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.password = inputElement.value;
  }

  async login_ant(): Promise<void> {
    this.errores = []; // 🔥 Reiniciar errores antes de validar
    if (await this.validarLogin()) {
      console.log("Usuario y password listo para ser logeado");

      this.authService.validarUsuario(this.username, this.password).subscribe(
        response => {
          if (response.resultado) {
            console.log("Login exitoso:", this.username);
            localStorage.setItem(environment.USR_NAME, this.username); 
            // Redirigir o ejecutar lógica de usuario autenticado
            this.authService.setLoginStatus(true);
            this.closeLogin();
            this.obtener_archivos(this.username); // 📌 Envía el mensaje al padre
          } else {
            this.authService.setLoginStatus(false);
            //this.errorMessage = 'Credenciales incorrectas';
            this.errores.push("Credenciales incorrectas");
            //console.log(this.errorMessage);
            alert(response.mensaje);
          }
        },
        error => {
          this.authService.setLoginStatus(false);
          console.error("Error en validación", error);
          //this.errorMessage = "Error de conexión con el servidor.";
          this.errores.push("Error de conexión con el servidor.");
          alert(error.error?.mensaje);
        }
      );

    } else {
      console.error("Formulario inválido. Revisa los campos.");
      alert("Por favor, completa correctamente todos los campos obligatorios.");
    }

  }

  async login(): Promise<void> {
    this.errores = []; // 🔥 Reiniciar errores antes de validar
    if (await this.validarLogin()) {
      console.log("Usuario y password listo para ser logeado");

      this.authService.login(this.username, this.password).subscribe(
         {
             next: () => {
          
            console.log("Login exitoso:", this.username);
            localStorage.setItem(environment.USR_NAME, this.username); 
            // Redirigir o ejecutar lógica de usuario autenticado
            this.authService.setLoginStatus(true);
            this.closeLogin();
            this.obtener_archivos(this.username); // 📌 Envía el mensaje al padre
          
          }
        ,
        error: err => {
          this.authService.setLoginStatus(false);
          console.error("Error en validación", err);
          //this.errorMessage = "Error de conexión con el servidor.";
          this.errores.push("Error de conexión con el servidor.");
          alert(err.error?.mensaje);
        }
    });

    } else {
      console.error("Formulario inválido. Revisa los campos.");
      alert("Por favor, completa correctamente todos los campos obligatorios.");
    }

  }

  obtener_archivos(username: string){
    this.cv_Service.obtenerArchivos(username);
  }

  closeLogin() {
    this.authService.closeLogin(); // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
  }

  togglePasswordVisibility() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  crearNuevoUsuario(){
    this.usuarioService.openUsuario(); // ✅ Activa el LoginComponent
  }

  async validarLogin(): Promise<boolean> {
    this.errores = []; // 🔥 Reiniciar errores antes de validar

    const { username, password } = this;

    // 📌 Validación: Usuario no puede estar vacío
    if (!username.trim()) {
      this.errores.push("El usuario no puede estar vacío.");
    }

    // 📌 Validación: Contraseña no puede estar vacía
    if (!password.trim()) {
      this.errores.push("La contraseña no puede estar vacía.");
    }

    // 📌 Si no hay errores, validamos el captcha()
    if (this.errores.length === 0) {
      const captcha = await this.validateCaptcha();
      if (!captcha){
        this.errores.push("Error en captcha");
      }
      return captcha;
    }

    return false; // ❌ No ejecuta login() si hay errores
  }

  olvidoPassword(){

  }
}