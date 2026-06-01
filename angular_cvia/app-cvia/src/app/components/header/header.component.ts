import { environment } from '../../../environments/environment';
import { Component, Input } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UsuarioService } from '../services/usuario.service';
import { CV_Service } from '../services/cv.service'; // 🔥 Importamos el servicio 

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})

export class HeaderComponent {
  @Input() isLoggedIn: boolean = false;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private cv_Service: CV_Service,
  ) {
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
  }

  // Check if localStorage is available
  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  logout() {
    if (this.isLocalStorageAvailable()) {
      localStorage.removeItem(environment.USR_NAME);
    }
    //this.isLoggedIn = false;
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
    this.authService.logout();
    let identificador_usuario = this.cv_Service.getIdentifier(environment.USR_NAME_UK);
    this.obtener_archivos(identificador_usuario); // 📌 Envía el mensaje al padre
  }

  showLogin() {
    this.authService.openLogin(); // ✅ Activa el LoginComponent
    this.isLocalStorageAvailable();
  }

  crearNuevoUsuario() {
    this.usuarioService.openUsuario(); // ✅ Activa el LoginComponent
  }

  showPerfil() {
    console.log("🔹 Click en Perfil"); // ✅ Verificar que se ejecuta
    let username: string = localStorage.getItem('username') ?? '';
    this.usuarioService.seleccionarUsuario(username); // ✅ Activa el LoginComponent
  }

  showCambiarPassword() {
    console.log("🔹 Click en cambiar password"); // ✅ Verificar que se ejecuta
    let username: string = localStorage.getItem('username') ?? '';
    this.usuarioService.seleccionarCambiaPassword(username); // ✅ Activa el LoginComponent
  }

  showDarBaja() {
    console.log("🔹 Click en dar de baja"); // ✅ Verificar que se ejecuta
    let username: string = localStorage.getItem('username') ?? '';
    this.usuarioService.seleccionarDarBaja(username); // ✅ Activa el LoginComponent
  }

  obtener_archivos(username: string){
    this.cv_Service.obtenerArchivos(username);
  }

}
