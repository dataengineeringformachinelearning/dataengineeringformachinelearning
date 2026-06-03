import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginDialog } from '../login-dialog/login-dialog';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, CommonModule, MatDialogModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);

  login() {
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '400px',
      hasBackdrop: true,
      backdropClass: 'blur-backdrop'
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const success = await this.authService.login(result);
        if (!success) {
          // Could handle error globally or in another dialog, for now handled silently in navbar
          alert('Login failed. Please check your credentials.');
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}

