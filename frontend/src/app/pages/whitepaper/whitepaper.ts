import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-whitepaper',
  standalone: true,
  imports: [],
  templateUrl: './whitepaper.html',
  styleUrl: './whitepaper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whitepaper implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle(
      'Whitepaper: Scalable Telemetry & Deep Learning Predictions - DEML APP',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Read our whitepaper detailing the architecture of real-time telemetry pipelines and deep learning SLA/TA predictions.',
    });
  }

  downloadPDF() {
    window.print();
  }
}
