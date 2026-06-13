import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Page Not Found - Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content:
        'The page you are looking for does not exist on Data Engineering for Machine Learning.',
    });
  }
}
