import { Routes } from '@angular/router';
import { Book } from './pages/book/book';
import { Status } from './pages/status/status';
import { Manage } from './pages/manage/manage';
import { Landing } from './pages/landing/landing';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'book', component: Book },
  { path: 'status', component: Status },
  { path: 'manage', component: Manage },
];
