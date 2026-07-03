import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VikingToaster } from '@dataengineeringformachinelearning/viking-ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VikingToaster],
  template: `
    <router-outlet />
    <viking-toaster />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
