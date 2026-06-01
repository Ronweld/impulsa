import { Component } from '@angular/core';
import { UsuarioService } from '../services/usuario.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuarios',
  standalone: true, // <-- ¡Importante! Asegúrate de que sea standalone
  templateUrl: './usuario.component.html',
  styleUrls: ['./usuario.component.css'],
  imports: [CommonModule, FormsModule]  // Importa FormsModule aquí  
})

export class UsuariosComponent {
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
    password: ''
  };

  mostrarPassword: boolean = false;
  modoEdicion = false; // `false` = Agregar | `true` = Editar usuario

  confirmPassword: string = '';
  mostrarConfirmPassword = false;
  passwordError: string | null = null;
  datosValidos: boolean = false;
  mostrarFormulario: boolean = false;
  errores: string[] = [];
  
  constructor(private usuarioService: UsuarioService) {}

  ngOnInit() {
    this.mostrarFormulario = true; // 🔥 Hace que el formulario se muestre automáticamente

    this.usuarioService.usuarioSeleccionado$.subscribe(nombreUsuario => {
      if (nombreUsuario) {
        this.visualizarUsuario(nombreUsuario); // ← Llama al método automáticamente
      }
    });
  }

  async agregarUsuario() {
    if (await this.validarUsuario()){
      this.usuarioService.agregarUsuario(this.usuarioData).subscribe((res:any) => console.log(res));
      this.closeUsuario();
    }
  }

  async actualizarUsuario() {
    if (await this.validarUsuario()){
      this.usuarioService.actualizarUsuario(this.usuarioData).subscribe((res:any) => console.log(res));
      this.closeUsuario();
    }
  }

  bloquearUsuario() {
    this.usuarioService.bloquearUsuario(this.usuarioData.nombre_usuario).subscribe((res:any) => console.log(res));
  }

  suspenderUsuario() {
    this.usuarioService.suspenderUsuario(this.usuarioData.nombre_usuario).subscribe((res:any) => console.log(res));
  }

  darDeBajaUsuario() {
    this.usuarioService.darDeBajaUsuario(this.usuarioData.nombre_usuario).subscribe((res:any) => console.log(res));
  }

  visualizarUsuario(userName : string) {
    this.usuarioService.visualizarUsuario(userName)
    .subscribe(
      response => {
        this.usuarioData = response;
        this.modoEdicion = true; // ← Cambia a edición tras recibir datos del backend
      },
      error => {
        console.error('Error al obtener usuario:', error);
      }
    );
  }

  togglePasswordVisibility() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  closeUsuario() {
    if (!this.modoEdicion){
      this.usuarioService.closeUsuario(); // ✅ Cierra la pantalla
    } else {
      this.usuarioService.closeSeleccionarUsuario(); // ✅ Cierra la pantalla
    }
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

    const { nombre_usuario, apellido_paterno, apellido_materno, nombres, email1, celular, direccion, tipo_documento_identidad, numero_documento_identidad, password } = this.usuarioData;

    // 📌 Validación: Nombre de usuario (Solo letras, números y guión bajo)
    const nombreUsuarioRegex = /^[a-zA-Z0-9_]+$/;
    if (!nombreUsuarioRegex.test(nombre_usuario)) {
      this.errores.push("El nombre de usuario solo puede contener letras, números y guión bajo.");
    }

    // 📌 Validación: Apellidos y nombres (mínimo 2 caracteres)
    const validarLongitud = (valor: string) => valor.trim().length >= 2;
    if (!validarLongitud(apellido_paterno)) this.errores.push("El apellido paterno es errado.");
    if (apellido_materno.trim() && !validarLongitud(apellido_materno)) this.errores.push("El apellido materno es errado.");
    if (!validarLongitud(nombres)) this.errores.push("El nombre es errado.");

    // 📌 Validación de email (No permite ".." y debe seguir formato válido)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?!.*\.\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email1)) this.errores.push("El correo electrónico no es válido o contiene '..' en la dirección.");

    // 📌 Validación de celular (solo números, mínimo 9 dígitos)
    const celularRegex = /^[0-9]{9,}$/;
    if (!celularRegex.test(celular)) this.errores.push("El celular debe contener solo números y al menos 9 dígitos.");

    // 📌 Validación de dirección (mínimo 5 caracteres)
    if (direccion.trim().length < 5) this.errores.push("La dirección debe ser válida y tener al menos 5 caracteres.");

    // 📌 Validación del número de documento basado en el tipo
    if (tipo_documento_identidad === "01" || tipo_documento_identidad === "04") {
      if (!/^\d+$/.test(numero_documento_identidad)) {
        this.errores.push("El número de documento debe contener solo números para DNI y RUC.");
      }
    } else {
      if (numero_documento_identidad.trim().length < 5) {
        this.errores.push("El número de documento debe ser válido.");
      }
    }

    if (!this.modoEdicion){
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
    }
    return this.errores.length === 0; // ✅ Retorna `true` si no hay errores
  }

}
