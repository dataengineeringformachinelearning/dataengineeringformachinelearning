import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-success',
  imports: [RouterLink],
  templateUrl: './success.html',
  styleUrl: './success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Success implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Subscription Successful - Web Application');
    this.metaService.updateTag({
      name: 'description',
      content: 'Your subscription was successful.',
    });
  }
}
