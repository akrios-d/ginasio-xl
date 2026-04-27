import { type Routes } from '@angular/router';
import { HomePage } from './features/home/home.page';
import { LoginPage } from './features/auth/login';
import { requireAuth, skipIfAuth } from './core/guards/app.guards';

export const routes: Routes = [
  { path: 'login', component: LoginPage, canActivate: [skipIfAuth] },
  { path: '', component: HomePage, canActivate: [requireAuth] },
  { path: '**', redirectTo: '' },
];
