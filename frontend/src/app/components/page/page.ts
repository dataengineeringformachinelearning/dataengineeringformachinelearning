// src/app/components/page/page.ts   (or wherever your file is)
import { Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    <markdown
      [src]="'assets/content/page.md'"
      (load)="onLoad($event)"
      (error)="onError($event)">
    </markdown>
  `
})
export class PageComponent {

  onLoad(event: any) {
    console.log('Markdown loaded successfully');
  }

  onError(error: any) {
    console.error('Error loading Markdown', error);
  }
}