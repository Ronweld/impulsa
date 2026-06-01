import { Component } from '@angular/core';
import { UsuarioService } from '../services/usuario.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password',
  standalone: true, // <-- ¡Importante! Asegúrate de que sea standalone
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css'],
  imports: [CommonModule, FormsModule]  // Importa FormsModule aquí  
})

export class PasswordComponent {
  usuarioData = {
    nombre_usuario: '',
    password: ''
  };

  mostrarPassword: boolean = false;
  confirmPassword: string = '';
  mostrarConfirmPassword = false;
  passwordError: string | null = null;
  datosValidos: boolean = false;
  mostrarFormulario: boolean = false;
  errores: string[] = [];
  
  constructor(private usuarioService: UsuarioService) {}

  ngOnInit() {
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente

    this.usuarioService.cambioPassword$.subscribe(nombreUsuario => {
      if (nombreUsuario) {
        this.visualizarUsuario(nombreUsuario); // ← Llama al método automáticamente
      }
    });
  }

  async actualizarContrasena() {
    if (await this.validarUsuario()){
      this.usuarioService.actualizarContraseña(this.usuarioData).subscribe((res:any) => console.log(res));
      this.closePassword();
    }
  }

  darDeBajaUsuario() {
    this.usuarioService.darDeBajaUsuario(this.usuarioData.nombre_usuario).subscribe((res:any) => console.log(res));
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

  togglePasswordVisibility() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  closePassword() {
    this.usuarioService.closePassword(); // ✅ Cierra la pantalla
    this.mostrarFormulario = false; // 🔥 Oculta el formulario y el overlay
  }


  toggleConfirmPasswordVisibility() {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }
  
  async validarPasswords(): Promise<boolean>{
    const { password } = this.usuarioData;

    if (this.confirmPassword && password !== this.confirmPassword) {
        this.passwordError = "Las contraseñas no coinciden.";
        this.datosValidos = false;
      } else {
        this.passwordError = null; // Ambas contraseñas son válidas y coinciden
        this.datosValidos = true;
      }

    return this.datosValidos;
  }

  async validarUsuario(): Promise<boolean>{
    this.errores = []; // 🔥 Reiniciar errores antes de validar

    const { nombre_usuario, password } = this.usuarioData;

    // 📌 Validación: Nombre de usuario (Solo letras, números y guión bajo)
    const nombreUsuarioRegex = /^[a-zA-Z0-9_]+$/;
    if (!nombreUsuarioRegex.test(nombre_usuario)) {
      this.errores.push("El nombre de usuario solo puede contener letras, números y guión bajo.");
    }

    // 📌 Validación de contraseña segura
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[_@$!%*?&#])[A-Za-z\d_@$!%*?&#]{8,25}$/;
    if (!passwordRegex.test(password)) {
      this.errores.push("La contraseña debe tener entre 8 y 25 caracteres, incluyendo al menos una mayúscula, una minúscula, un número y un carácter especial.");
    }

    // 📌 Evitar contraseñas comunes o fácilmente adivinables
    const contraseñasDebiles = ["123456","12345678", "password", "qwerty", "abc123", "admin", "test"];
    if (contraseñasDebiles.includes(password.toLowerCase())) {
      this.errores.push("La contraseña es demasiado común. Usa algo más seguro.");
    }

    // Validamos que el password se haya escrito correctamente
    if (this.confirmPassword && password !== this.confirmPassword) {
        this.errores.push("Las contraseñas no coinciden.");
    }
  
    return this.errores.length === 0; // ✅ Retorna `true` si no hay errores
  }

}
