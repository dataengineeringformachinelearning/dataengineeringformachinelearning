import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-whitepaper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whitepaper.html',
  styleUrl: './whitepaper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whitepaper implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Whitepaper: Scalable Telemetry & SLA Predictions - Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content: 'Read our technical whitepaper detailing the architecture of real-time telemetry pipelines and ML-based SLA predictions.'
    });
  }
}
