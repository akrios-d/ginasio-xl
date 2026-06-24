import { type Routes } from '@angular/router';
import { LoginPage } from './features/auth/login';
import { requireAuth, skipIfAuth } from './core/guards/app.guards';

export const routes: Routes = [
  { path: 'login', component: LoginPage, canActivate: [skipIfAuth] },
  {
    path: '',
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
    canActivate: [requireAuth],
  },
  {
    path: 'training',
    loadComponent: () => import('./features/training/training.page').then((m) => m.TrainingPage),
    canActivate: [requireAuth],
  },
  {
    path: 'assessment',
    loadComponent: () =>
      import('./features/assessment/assessment.page').then((m) => m.AssessmentPage),
    canActivate: [requireAuth],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
    canActivate: [requireAuth],
  },
  { path: '**', redirectTo: '' },
];
