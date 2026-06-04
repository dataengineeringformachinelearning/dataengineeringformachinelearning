import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-book',
  imports: [PageComponent, MatCardModule],
  templateUrl: './book.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './book.scss',
})
export class Book {}
