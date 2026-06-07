import { Routes } from '@angular/router';
import { Book } from './pages/book/book';
import { Status } from './pages/status/status';
import { Manage } from './pages/manage/manage';
import { Landing } from './pages/landing/landing';
import { Privacy } from './pages/privacy/privacy';
import { Explore } from './pages/explore/explore';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'book', redirectTo: 'documentation', pathMatch: 'full' },
  { path: 'documentation', component: Book },
  { path: 'status', component: Status },
  { path: 'status/:slug', component: Status },
  { path: 'explore', component: Explore },
  { path: 'manage', component: Manage },
  { path: 'privacy', component: Privacy },
];

