import { ApplicationConfig } from '@angular/core';
import {provideRouter} from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // 🔥 Importa HttpClient correctamente
import {routes} from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Agrega aquí proveedores globales, si es necesario
    provideRouter(routes),
    provideHttpClient(),

  ],
};


