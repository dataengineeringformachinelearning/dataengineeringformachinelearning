import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Documentation implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Developer Portal - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content: 'API Gateway and Platform Documentation.',
    });
  }
}
