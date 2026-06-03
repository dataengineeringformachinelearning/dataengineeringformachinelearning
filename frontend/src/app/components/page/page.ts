import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

import pageMarkdown from '../../../assets/content/page.md';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <markdown [data]="markdownContent"></markdown> `,
})
export class PageComponent {
  markdownContent: string = pageMarkdown;
}
