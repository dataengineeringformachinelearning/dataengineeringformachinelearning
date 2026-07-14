import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
    '[attr.id]': 'id()',
  },
  template: `
    <viking-field [label]="label() ?? ''">
      <viking-select
        [options]="vikingOptions()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
        [disabled]="disabled()"
        [width]="width()"
        [label]="label() ?? ''"
        placeholder="Select an option"
      />
    </viking-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnifiedSelect {
  readonly id = input<string | null>(null);
  readonly label = input<string | undefined>();
  readonly options = input<SelectOption[]>([]);
  readonly value = input<string | null>(null);
  readonly disabled = input(false);
  readonly width = input<VikingSelectWidth>('half');
  readonly valueChange = output<string>();

  protected readonly vikingOptions = computed<VikingSelectOption[]>(() =>
    this.options().map(option => ({ label: option.label, value: option.value })),
  );
}
