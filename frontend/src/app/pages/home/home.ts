import { Component } from '@angular/core';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-home',
  imports: [PageComponent, MatCardModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
