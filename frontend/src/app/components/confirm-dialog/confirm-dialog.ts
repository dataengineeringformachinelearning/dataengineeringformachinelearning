import { Component, ChangeDetectionStrategy } from '@angular/core';
import { VikingConfirmDialog } from '@dataengineeringformachinelearning/viking-ui';

/** App shell mounts the kit confirm dialog once at root. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [VikingConfirmDialog],
  template: `<viking-confirm-dialog />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {}
