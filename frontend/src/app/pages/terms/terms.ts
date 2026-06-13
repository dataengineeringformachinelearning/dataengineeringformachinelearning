import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-terms',
  imports: [],
  templateUrl: './terms.html',
  styleUrl: './terms.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Terms implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Terms & Conditions - Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Terms and conditions of service for using the Data Engineering for Machine Learning platform and website.',
    });
  }
}
