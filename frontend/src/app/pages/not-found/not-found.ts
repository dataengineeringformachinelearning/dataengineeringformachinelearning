import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import {
  VikingButton,
  VikingCard,
  VikingHeading,
  VikingText,
} from '@dataengineeringformachinelearning/viking-ui';

@Component({
  selector: 'app-not-found',
  imports: [VikingButton, VikingCard, VikingHeading, VikingText],
  templateUrl: './not-found.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Page Not Found - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content: 'The page you are looking for does not exist on DEML APP.',
    });
  }
}
