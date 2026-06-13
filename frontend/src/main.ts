import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import './app/bones/registry';

Sentry.init({
  dsn: 'https://9ad77ac1928f32aad465cb85d745262a@o4511437520044032.ingest.us.sentry.io/4511556274749440',
});

bootstrapApplication(App, appConfig).catch(err => console.error(err));
