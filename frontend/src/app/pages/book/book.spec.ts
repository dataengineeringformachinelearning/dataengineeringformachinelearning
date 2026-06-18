import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Book } from './book';

import { MarkdownModule } from 'ngx-markdown';

describe('Book', () => {
  let component: Book;
  let fixture: ComponentFixture<Book>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Book, MarkdownModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(Book);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
