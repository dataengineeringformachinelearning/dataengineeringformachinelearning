import { Component } from '@angular/core';
import { StabilityChart } from '../../components/stability-chart/stability-chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StabilityChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
}
