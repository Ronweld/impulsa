import { Routes } from '@angular/router';
import { StartupComponent } from './components/startup/startup.component';
import { LoginComponent } from './components/login/login.component';
import { UsuariosComponent } from './components/usuarios/usuario.component';

export const routes: Routes = [
  { path: '',
    title: 'Impulsa',
    component: StartupComponent, 
  },
  { path: 'startup', 
    title: 't2',
    component: StartupComponent,
  },
  { path: 'login', 
    title: 't3',
    component: LoginComponent, 
  },
  { path: 'usuario', 
    title: 't4',
    component: UsuariosComponent,
   },
  //{ path: '/profile', component: ProfileComponent }
];
