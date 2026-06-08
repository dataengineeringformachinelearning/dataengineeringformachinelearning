import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorAssertion
} from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUserId = signal<number | null>(null);
  public isInitialized = signal<boolean>(false);
  private http = inject(HttpClient);
  public auth: any;

  constructor() {
    if (typeof window !== 'undefined') {
      const app = initializeApp(environment.firebase);
      this.auth = getAuth(app);

      onAuthStateChanged(this.auth, async (user: FirebaseUser | null) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            const res: any = await firstValueFrom(
              this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
                headers: { Authorization: `Bearer ${token}` }
              })
            );
            if (res.status === 'success') {
              this.isAuthenticated.set(true);
              this.currentUserId.set(res.user_id);
            } else {
              this.isAuthenticated.set(false);
              this.currentUserId.set(null);
            }
          } catch (e) {
            console.error('Failed to sync auth with backend', e);
            this.isAuthenticated.set(false);
            this.currentUserId.set(null);
          }
        } else {
          this.isAuthenticated.set(false);
          this.currentUserId.set(null);
        }
        this.isInitialized.set(true);
      });
    } else {
      this.isInitialized.set(true);
    }
  }

  async checkAuth() {
    if (!this.auth) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      return;
    }
    const user = this.auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        const res: any = await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
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
    } else {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    }
  }

  async login(credentials: any): Promise<{ success: boolean; error?: string; resolver?: any }> {
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      // Treat credentials.username as the login email
      await signInWithEmailAndPassword(this.auth, credentials.username, credentials.password);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      if (e?.code === 'auth/multi-factor-auth-required') {
        return { success: false, error: 'MFA_REQUIRED', resolver: getMultiFactorResolver(this.auth, e) };
      }
      let errorMsg = 'Invalid credentials or user does not exist.';
      if (e?.code) {
        if (e.code === 'auth/invalid-email' || e.code === 'auth/invalid-credential') {
          errorMsg = 'Invalid email or password.';
        } else if (e.code === 'auth/user-not-found') {
          errorMsg = 'User does not exist.';
        } else if (e.code === 'auth/wrong-password') {
          errorMsg = 'Incorrect password.';
        } else {
          errorMsg = 'An error occurred during sign in. Please try again.';
        }
      } else {
        errorMsg = 'An error occurred during sign in. Please try again.';
      }
      return { success: false, error: errorMsg };
    }
  }

  async register(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const userCredential = await createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: credentials.username });
        
        // Make sync call to backend so the User profile is immediately created in Django DB
        const token = await userCredential.user.getIdToken();
        await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
      }
      return { success: true };
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Registration failed.';
      if (e?.code) {
        if (e.code === 'auth/email-already-in-use') {
          errorMsg = 'Email already in use.';
        } else if (e.code === 'auth/weak-password') {
          errorMsg = 'Password is too weak. Must be at least 6 characters.';
        } else if (e.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email address format.';
        } else {
          errorMsg = 'An error occurred during registration. Please try again.';
        }
      } else {
        errorMsg = 'An error occurred during registration. Please try again.';
      }
      return { success: false, error: errorMsg };
    }
  }

  async logout() {
    try {
      if (this.auth) {
        await signOut(this.auth);
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    } catch (e) {
      console.error(e);
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    }
  }

  async deleteAccount() {
    try {
      // First delete on backend (so request is authenticated with active token)
      await firstValueFrom(this.http.delete(`${environment.backendUrl}/api/v1/auth/delete-account`, {}));
      
      // Then delete from Firebase
      if (this.auth?.currentUser) {
        await deleteUser(this.auth.currentUser);
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async forgotPassword(email: string) {
    try {
      if (!this.auth) return false;
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async resetPassword(payload: any) {
    try {
      if (!this.auth) return false;
      await confirmPasswordReset(this.auth, payload.token, payload.new_password);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
