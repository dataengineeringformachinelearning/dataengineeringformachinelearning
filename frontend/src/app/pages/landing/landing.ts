import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {}
