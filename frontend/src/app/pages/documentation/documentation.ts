import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import readmeMarkdown from '../../../assets/content/readme.md';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Documentation implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public content = readmeMarkdown;

  ngOnInit() {
    this.titleService.setTitle('Developer Portal - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content: 'API Gateway and Platform Documentation.',
    });
  }
}
