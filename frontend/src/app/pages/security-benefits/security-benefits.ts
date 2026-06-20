import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-security-benefits',
  standalone: true,
  imports: [MatIconModule, RouterModule],
  templateUrl: './security-benefits.html',
  styleUrl: './security-benefits.scss',
})
export class SecurityBenefits {}
