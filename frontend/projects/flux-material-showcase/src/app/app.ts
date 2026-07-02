import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FluxToaster } from '@deml/flux-material';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FluxToaster],
  template: `
    <router-outlet />
    <flux-toaster />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
