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
    this.titleService.setTitle('Terms & Conditions - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Terms and conditions of service for using the DEML (DATA ENGINEERING FOR MACHINE LEARNING) and website.',
    });
  }
}
