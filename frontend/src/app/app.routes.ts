import { Routes } from '@angular/router';
import { Book } from './pages/book/book';
import { Status } from './pages/status/status';
import { Settings } from './pages/settings/settings';
import { Landing } from './pages/landing/landing';
import { Privacy } from './pages/privacy/privacy';
import { Terms } from './pages/terms/terms';
import { NotFound } from './pages/not-found/not-found';
import { Explore } from './pages/explore/explore';
import { IsolatedStatus } from './pages/isolated-status/isolated-status';
import { Whitepaper } from './pages/whitepaper/whitepaper';
import { Compliance } from './pages/compliance/compliance';
import { Vulnerabilities } from './pages/vulnerabilities/vulnerabilities';
import { AnalyticsComponent } from './pages/analytics/analytics';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'book', redirectTo: 'documentation', pathMatch: 'full' },
  { path: 'documentation', component: Book },
  { path: 'status', component: Status },
  { path: 'status/:slug', component: IsolatedStatus },
  { path: 'explore', component: Explore },
  { path: 'vulnerabilities', component: Vulnerabilities },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'settings', component: Settings },
  { path: 'compliance', component: Compliance },
  { path: 'privacy', component: Privacy },
  { path: 'terms', component: Terms },
  { path: 'whitepaper', component: Whitepaper },
  { path: 'login', component: Login },
  { path: '**', component: NotFound },
];
