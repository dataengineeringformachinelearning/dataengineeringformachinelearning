import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { resolveRouteMeta } from '../core/page-meta';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  applyForUrl(url: string): void {
    const { title, description } = resolveRouteMeta(url);
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'title', content: title });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'twitter:description', content: description });

    if (isPlatformBrowser(this.platformId)) {
      const canonical = `${environment.frontendUrl}${url.split('?')[0]?.split('#')[0] ?? '/'}`;
      this.meta.updateTag({ property: 'og:url', content: canonical });
      this.meta.updateTag({ property: 'twitter:url', content: canonical });
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }
  }
}
