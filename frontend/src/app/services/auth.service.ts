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

  async login(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/login`, credentials));
      if (res && res.status === 'success') {
        this.isAuthenticated.set(true);
        this.currentUserId.set(res.user_id);
        return { success: true };
      }
      return { success: false, error: 'Login failed.' };
    } catch (e: any) {
      let errorMsg = 'Invalid credentials or user does not exist.';
      if (e?.error) {
        if (typeof e.error === 'string') {
          errorMsg = e.error;
        } else if (e.error.detail) {
          errorMsg = typeof e.error.detail === 'string' ? e.error.detail : JSON.stringify(e.error.detail);
        } else if (e.error.message) {
          errorMsg = e.error.message;
        }
      }
      return { success: false, error: errorMsg };
    }
  }

  async register(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.backendUrl}/api/v1/auth/register`, credentials));
      if (res && res.status === 'success') {
        this.isAuthenticated.set(true);
        this.currentUserId.set(res.user_id);
        return { success: true };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (e: any) {
      let errorMsg = 'Registration failed.';
      if (e?.error) {
        if (typeof e.error === 'string') {
          errorMsg = e.error;
        } else if (e.error.detail) {
          errorMsg = typeof e.error.detail === 'string' ? e.error.detail : JSON.stringify(e.error.detail);
        } else if (e.error.message) {
          errorMsg = e.error.message;
        }
      }
      return { success: false, error: errorMsg };
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

  async deleteAccount() {
    try {
      await firstValueFrom(this.http.delete(`${environment.backendUrl}/api/v1/auth/delete-account`, {}));
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      return true;
    } catch (e) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      return false;
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

