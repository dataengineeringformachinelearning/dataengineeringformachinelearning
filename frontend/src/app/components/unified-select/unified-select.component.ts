import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FluxField, FluxSelect, FluxSelectOption } from '@deml/flux-material';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-unified-select',
  standalone: true,
  imports: [FormsModule, FluxField, FluxSelect],
  template: `
    <flux-field [label]="label ?? ''">
      <flux-select
        [options]="fluxOptions"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled"
        placeholder="Select an option"
      />
    </flux-field>
  `,
})
export class UnifiedSelect {
  @Input() id = `unified-select-${Math.random().toString(36).substring(2, 9)}`;
  @Input() label?: string;
  @Input() options: SelectOption[] = [];
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  protected get fluxOptions(): FluxSelectOption[] {
    return this.options.map(opt => ({ label: opt.label, value: opt.value }));
  }
}
