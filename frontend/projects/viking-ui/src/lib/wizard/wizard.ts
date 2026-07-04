import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VikingProgress } from '../progress/progress';

export interface VikingWizardStep {
  id: string;
  label: string;
}

/**
 * viking-wizard — multi-step modal shell with progress and action slots.
 */
@Component({
  selector: 'viking-wizard',
  imports: [VikingProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'viking-wizard' },
  template: `
    <viking-progress [value]="progressPercent()" />
    <p class="viking-wizard-step-label">{{ activeStep().label }}</p>
    <div class="viking-wizard-body">
      <ng-content />
    </div>
    <footer class="viking-wizard-actions">
      <ng-content select="[vikingWizardActions]" />
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        font-family: var(--viking-font-family);
      }
      .viking-wizard-step-label {
        margin: 0;
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text-muted);
        letter-spacing: var(--viking-letter-spacing-wide);
        text-transform: uppercase;
      }
      .viking-wizard-body {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
      }
      .viking-wizard-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--viking-space-1);
        padding-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
    `,
  ],
})
export class VikingWizard {
  readonly steps = input<VikingWizardStep[]>([]);
  readonly step = input<string>('');

  protected readonly activeStep = computed(
    () =>
      this.steps().find(item => item.id === this.step()) ??
      this.steps()[0] ?? { id: '', label: '' },
  );

  protected readonly progressPercent = computed(() => {
    const steps = this.steps();
    if (steps.length <= 1) return 100;
    const index = steps.findIndex(item => item.id === this.step());
    return Math.round(((index + 1) / steps.length) * 100);
  });
}
