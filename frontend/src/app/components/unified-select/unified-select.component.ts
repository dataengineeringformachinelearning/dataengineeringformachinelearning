import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  VikingField,
  VikingSelect,
  VikingSelectOption,
} from '@dataengineeringformachinelearning/viking-ui';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-unified-select',
  standalone: true,
  imports: [FormsModule, VikingField, VikingSelect],
  template: `
    <viking-field [label]="label ?? ''">
      <viking-select
        [options]="fluxOptions"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        placeholder="Select an option"
      />
    </viking-field>
  `,
})
export class UnifiedSelect {
  @Input() id = `unified-select-${Math.random().toString(36).substring(2, 9)}`;
  @Input() label?: string;
  @Input() options: SelectOption[] = [];
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  protected get fluxOptions(): VikingSelectOption[] {
    return this.options.map(opt => ({ label: opt.label, value: opt.value }));
  }
}
