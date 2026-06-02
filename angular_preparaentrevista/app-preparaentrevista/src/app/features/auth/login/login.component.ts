// src/app/components/login/login.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html' 
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private auth: AuthService, private session: SessionService) {}

  ngOnInit(): void {
    console.log("Ingresando al componente login...");
  }
  /*
  login() {
    this.auth.login(this.username, this.password).subscribe(() => {
      const jd=1;
      this.session.createSession({"jd":jd }).subscribe((res:any) => {
        console.log('Sesión creada:', res);
        localStorage.setItem('session_id', String(res.session_id));
        window.location.href = '/chat';
      });
    });
  }*/

  login() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        // ✅ Login correcto → redirigir
        localStorage.setItem('origen_app', '');
        localStorage.setItem('username', this.username);
        window.location.href = '/jd';
      },
      error: (err) => {
        // ❌ Login fallido → mostrar mensaje
        console.error("Error en login:", err);
        alert("Usuario o contraseña incorrectos");
      }
    });
  }

}
