import { Component, ChangeDetectionStrategy, OnInit, inject, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

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

  ngOnInit() {
    const footer = this.elementRef.nativeElement.querySelector('.landing-footer');
    if (footer) {
      const script = document.createElement('script');
      script.src = 'assets/widget.js';
      script.setAttribute('data-page-id', 'platform-status');
      footer.appendChild(script);
    }
  }
}
