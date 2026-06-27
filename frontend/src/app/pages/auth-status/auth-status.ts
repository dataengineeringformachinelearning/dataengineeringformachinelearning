import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-status',
  standalone: true,
  template: ` <div style="display:none;">Auth status checker for cross-site iframe</div> `,
  styles: [],
})
export class AuthStatus implements OnInit {
  private authService = inject(AuthService);

  ngOnInit() {
    // The component is loaded in a hidden iframe from the marketing site to share the browser's auth context from the main app domain.
    // It accesses the Firebase/auth state and posts via postMessage.
    // Wait for auth initialization. Use env configured domains where possible.
    const checkAndPost = () => {
      if (this.authService.isInitialized()) {
        const isAuth = this.authService.isAuthenticated();
        const userId = this.authService.currentUserId();
        const role = this.authService.currentUserRole();

        const status = {
          type: 'AUTH_STATUS',
          isAuthenticated: isAuth,
          userId: userId,
          role: role,
          timestamp: Date.now(),
        };

        // Post to the marketing origin (update if domain changes).
        // Post to any parent; the listener will validate the origin strictly for security.
        if (window.parent && window.parent !== window) {
          let targetOrigin = '';
          if (document.referrer) {
            try {
              const refUrl = new URL(document.referrer);
              const host = refUrl.hostname;
              if (
                host === 'localhost' ||
                host === '127.0.0.1' ||
                host.endsWith('dataengineeringformachinelearning.com') ||
                host.endsWith('deml.app')
              ) {
                targetOrigin = refUrl.origin;
              }
            } catch (e) {
              console.error('[AuthStatus] Failed to parse referrer URL:', e);
            }
          }
          if (targetOrigin) {
            window.parent.postMessage(status, targetOrigin);
          } else {
            console.warn(
              '[AuthStatus] Refusing to post message to untrusted or empty referrer:',
              document.referrer,
            );
          }
        }

        console.log('[AuthStatus] Posted auth status to parent:', status);
      } else {
        // Retry soon if not initialized
        setTimeout(checkAndPost, 300);
      }
    };

    setTimeout(checkAndPost, 200);
  }
}
