import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Server-side session registry API (Dragonfly-backed). */
@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);

  register = async (sessionId: string, token: string): Promise<void> => {
    await firstValueFrom(
      this.http.post(
        `${environment.backendUrl}/api/v1/auth/sessions`,
        {
          session_id: sessionId,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
  };

  logout = async (sessionId: string | null, token: string, revokeAll = false): Promise<void> => {
    await firstValueFrom(
      this.http.post(
        `${environment.backendUrl}/api/v1/auth/logout`,
        { session_id: sessionId, revoke_all: revokeAll },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
  };
}
