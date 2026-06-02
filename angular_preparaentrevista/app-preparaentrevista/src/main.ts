/*import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
*/


import { bootstrapApplication } from '@angular/platform-browser';
//import { importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideMarkdown } from 'ngx-markdown';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), 
    provideMarkdown(),   // 🔑 inicializa Markdown en standalone
    provideHttpClient(withInterceptors([AuthInterceptor]))

  ]
}).catch(err => console.error(err));
