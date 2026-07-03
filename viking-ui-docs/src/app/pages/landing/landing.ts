import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import {
  VikingBrand,
  VikingButton,
  VikingHeading,
  VikingText,
} from '@dataengineeringformachinelearning/viking-ui';

/** Landing page — spartan.ng-style hero before the component browser. */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, VikingBrand, VikingButton, VikingHeading, VikingText],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  constructor() {
    inject(Title).setTitle('Viking-UI — Angular Component Library');
  }
}
