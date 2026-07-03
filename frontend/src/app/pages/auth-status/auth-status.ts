import { Component, OnInit, inject, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const TRUSTED_PARENT_HOSTS = [
  'localhost',
  '127.0.0.1',
  'dataengineeringformachinelearning.com',
  'deml.app',
];

const isTrustedParentOrigin = (origin: string): boolean => {
  try {
    const host = new URL(origin).hostname;
    return TRUSTED_PARENT_HOSTS.some(trusted => host === trusted || host.endsWith(`.${trusted}`));
  } catch {
    return false;
  }
};

const resolveParentOrigin = (explicitOrigin: string | null, referrer: string): string => {
  if (explicitOrigin && isTrustedParentOrigin(explicitOrigin)) {
    return explicitOrigin;
  }
  if (!referrer) return '';
  try {
    const origin = new URL(referrer).origin;
    return isTrustedParentOrigin(origin) ? origin : '';
  } catch {
    return '';
  }
};

@Component({
  selector: 'app-auth-status',
  standalone: true,
  template: ` <div hidden aria-hidden="true">Auth status checker for cross-site iframe</div> `,
  styles: [],
})
export class AuthStatus implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private parentOrigin = '';

  constructor() {
    effect(() => {
      if (!this.parentOrigin) return;
      if (!this.authService.isInitialized() || this.authService.isProcessing()) {
        return;
      }
      this.postStatus();
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.parentOrigin = resolveParentOrigin(
      params.get('parent_origin'),
      typeof document !== 'undefined' ? document.referrer : '',
    );

    const action = params.get('action');
    if (action === 'signout') {
      void this.authService.logout().then(() => this.postStatus());
    }
  }

  private postStatus(): void {
    if (!this.parentOrigin || !window.parent || window.parent === window) {
      return;
    }

    const status = {
      type: 'AUTH_STATUS' as const,
      isAuthenticated: this.authService.isAuthenticated(),
      userId: this.authService.currentUserId(),
      role: this.authService.currentUserRole(),
      timestamp: Date.now(),
    };

    window.parent.postMessage(status, this.parentOrigin);
  }
}
