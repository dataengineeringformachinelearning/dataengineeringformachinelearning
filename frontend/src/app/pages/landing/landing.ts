import { Component, ChangeDetectionStrategy, OnInit, inject, ElementRef, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit {
  private elementRef = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content: 'Interactive steps, working notes, and AI annotation on the Data Engineering for Machine Learning book.'
    });

    if (isPlatformBrowser(this.platformId)) {
      const footer = this.elementRef.nativeElement.querySelector('.landing-footer');
      if (footer) {
        const script = document.createElement('script');
        script.src = 'assets/widget.js';
        script.setAttribute('data-page-id', 'platform-status');
        script.setAttribute('data-backend-url', environment.backendUrl);
        footer.appendChild(script);
      }
    }
  }
}
