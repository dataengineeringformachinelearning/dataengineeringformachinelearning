import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  VikingField,
  VikingSelect,
  VikingSelectOption,
  VikingSelectWidth,
} from '@dataengineeringformachinelearning/viking-ui';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-unified-select',
  standalone: true,
  imports: [FormsModule, VikingField, VikingSelect],
  host: {
    class: 'app-unified-select',
    '[class.unified-select-full]': "width === 'full'",
    '[class.unified-select-half]': "width === 'half'",
  },
  template: `
    <viking-field [label]="label ?? ''">
      <viking-select
        [options]="fluxOptions"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        [width]="width"
        placeholder="Select an option"
      />
    </viking-field>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      :host(.unified-select-full) {
        width: 100%;
      }

      :host(.unified-select-half) {
        width: 100%;
        max-width: var(--viking-select-half-max-width, min(100%, 24rem));
      }

      :host ::ng-deep viking-field {
        width: 100%;
      }
    `,
  ],
})
export class UnifiedSelect {
  @Input() id = `unified-select-${Math.random().toString(36).substring(2, 9)}`;
  @Input() label?: string;
  @Input() options: SelectOption[] = [];
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Input() width: VikingSelectWidth = 'full';
  @Output() valueChange = new EventEmitter<string>();

  protected get fluxOptions(): VikingSelectOption[] {
    return this.options.map(opt => ({ label: opt.label, value: opt.value }));
  }
}
