import { Component, OnInit, inject } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { HttpClient } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';

const MARKDOWN_KEY = makeStateKey<string>('pageMarkdown');

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [MarkdownComponent],
  template: `
    <markdown [data]="markdownContent"></markdown>
  `
})
export class PageComponent implements OnInit {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);

  markdownContent = '';

  ngOnInit() {
    const cached = this.transferState.get(MARKDOWN_KEY, '');

    if (cached) {
      this.markdownContent = cached;
      return;
    }

    this.http.get('assets/content/page.md', { responseType: 'text' })
      .subscribe({
        next: (md) => {
          this.markdownContent = md;
          this.transferState.set(MARKDOWN_KEY, md);
        },
        error: (err) => console.error('Failed to load markdown', err)
      });
  }
}