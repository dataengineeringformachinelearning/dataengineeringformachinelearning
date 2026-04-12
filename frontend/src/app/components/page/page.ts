import { Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

// Import the markdown file as raw text using the loader you already configured
import pageMarkdownRaw from '../../../assets/content/page.md';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    <markdown [data]="markdownContent"></markdown>
  `
})
export class PageComponent {
  markdownContent = pageMarkdownRaw;
}