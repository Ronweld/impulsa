import { Routes } from '@angular/router';
import { JDUploadComponent } from './features/jd/jd-upload/jd-upload.component';
import { ChatComponent } from './features/interview/chat/chat.component';
import { ResultComponent } from './features/result/result/result.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  { path: 'jd', component: JDUploadComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'result', component: ResultComponent },
  { path: 'login', component: LoginComponent }
];