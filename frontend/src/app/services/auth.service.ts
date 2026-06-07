import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUserId = signal<number | null>(null);
  private http = inject(HttpClient);

  async checkAuth() {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.backendUrl}/api/v1/auth/user`));
      if (res.status === 'success') {
        this.isAuthenticated.set(true);
        this.currentUserId.set(res.user_id);
      } else {
        this.isAuthenticated.set(false);
        this.currentUserId.set(null);
      }
    } catch (e) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    }
  }

  async login(credentials: any) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/login`, credentials));
      if (res.status === 'success') {
        this.isAuthenticated.set(true);
        this.currentUserId.set(res.user_id);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async register(credentials: any) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/register`, credentials));
      if (res.status === 'success') {
        this.isAuthenticated.set(true);
        this.currentUserId.set(res.user_id);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async logout() {
    try {
      await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/logout`, {}));
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    } catch (e) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    }
  }

  async forgotPassword(email: string) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/forgot-password`, { email }));
      return res.status === 'success';
    } catch (e) {
      return false;
    }
  }

  async resetPassword(payload: any) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/reset-password`, payload));
      return res.status === 'success';
    } catch (e) {
      return false;
    }
  }
}

