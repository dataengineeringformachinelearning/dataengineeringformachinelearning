import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-home',
  imports: [PageComponent, MatCardModule],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.scss',
})
export class Home {}
