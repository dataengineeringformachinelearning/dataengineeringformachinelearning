import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  private http = inject(HttpClient);

  async checkAuth() {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.backendUrl}/api/auth/user`));
      if (res.status === 'success') {
        this.isAuthenticated.set(true);
      } else {
        this.isAuthenticated.set(false);
      }
    } catch (e) {
      this.isAuthenticated.set(false);
    }
  }

  async login(credentials: any) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/auth/login`, credentials));
      if (res.status === 'success') {
        this.isAuthenticated.set(true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async logout() {
    try {
      await firstValueFrom(this.http.post(`${environment.backendUrl}/api/auth/logout`, {}));
      this.isAuthenticated.set(false);
    } catch (e) {
      this.isAuthenticated.set(false);
    }
  }
}
