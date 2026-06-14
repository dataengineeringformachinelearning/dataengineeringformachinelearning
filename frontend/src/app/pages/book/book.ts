import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BookService } from '../../services/book.service';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    CommonModule,
    PageComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './book.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './book.scss',
})
export class Book implements OnInit {
  public bookService = inject(BookService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle(
      'Documentation & Book Chapters - Data Engineering for Machine Learning',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Interactive guide, working notes, and reference chapters on Data Engineering for Machine Learning.',
    });
  }
}
