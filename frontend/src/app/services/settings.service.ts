import { Injectable, signal } from '@angular/core';
import { StatusPageData } from './monitor.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  statusPages = signal<StatusPageData[]>([]);
  selectedPage = signal<StatusPageData | null>(null);

  selectPage(page: StatusPageData | null) {
    this.selectedPage.set(page);
  }
}
