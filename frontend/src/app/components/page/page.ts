import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

import pageMarkdown from '../../../assets/content/page.md';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <markdown [data]="data || fallbackMarkdown"></markdown> `,
})
export class PageComponent {
  @Input() data: string = '';
  fallbackMarkdown: string = pageMarkdown;
}
