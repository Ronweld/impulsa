import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // 🔥 Importa HttpClient correctamente
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { MarkdownModule } from 'ngx-markdown';
import { AuthInterceptor } from '../../app-cvia/src/app/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // 🔥 Proveedor de rutas
    provideHttpClient(), // 🔥 Proveedor de HttpClient para las llamadas HTTP
    importProvidersFrom(MarkdownModule.forRoot()), // ✅ Nueva forma de importar el módulo
    provideHttpClient(withInterceptors([AuthInterceptor]))
  ]
}).catch(err => {
  console.error('❌ Error al iniciar la aplicación:', err);
});
