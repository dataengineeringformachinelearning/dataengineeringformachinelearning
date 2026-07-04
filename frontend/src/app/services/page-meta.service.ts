import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { resolveRouteMeta } from '../core/page-meta';
import { environment } from '../../environments/environment';

const OG_IMAGE = '/data-engineering-for-machine-learning-preview.png';
const OG_IMAGE_ALT =
  'DEML application preview — data engineering and machine learning telemetry dashboard';
const ALGOLIA_SITE_VERIFICATION = '687B59B29612DE68'; // pragma: allowlist secret

@Injectable({ providedIn: 'root' })
export class PageMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  applyForUrl(url: string): void {
    const { title, description, robots, keywords, ogType } = resolveRouteMeta(url);
    const path = url.split('?')[0]?.split('#')[0] ?? '/';
    const canonical = `${environment.frontendUrl}${path.startsWith('/') ? path : `/${path}`}`;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'algolia-site-verification', content: ALGOLIA_SITE_VERIFICATION });
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'title', content: title });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({
      property: 'og:image',
      content: `${environment.frontendUrl}${OG_IMAGE}`,
    });
    this.meta.updateTag({ property: 'og:image:alt', content: OG_IMAGE_ALT });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:url', content: canonical });
    this.meta.updateTag({
      name: 'twitter:image',
      content: `${environment.frontendUrl}${OG_IMAGE}`,
    });
    this.meta.updateTag({ name: 'twitter:image:alt', content: OG_IMAGE_ALT });

    if (keywords) {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    }

    this.setCanonicalLink(canonical);
  }

  private setCanonicalLink(href: string): void {
    const head = this.document.head;
    if (!head) {
      return;
    }

    let link = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
