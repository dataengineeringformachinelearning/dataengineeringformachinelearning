import { Component } from '@angular/core';
import { PageComponent } from '../../components/page/page';

@Component({
  selector: 'app-home',
  imports: [PageComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
