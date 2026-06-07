import { Routes } from '@angular/router';
import { Book } from './pages/book/book';
import { Dashboard } from './pages/dashboard/dashboard';
import { Manage } from './pages/manage/manage';
import { Landing } from './pages/landing/landing';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'book', component: Book },
  { path: 'dashboard', component: Dashboard },
  { path: 'manage', component: Manage },
];
