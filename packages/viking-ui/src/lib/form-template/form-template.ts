import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

/** Represents a form field state for validation */
export interface VikingFormFieldState {
  id: string;
  valid: boolean;
  errors: string[];
}

/**
 * viking-form-template — page-level form orchestration with error focus.
 * Based on Cloudscape Form Template pattern, adapted for Viking-UI.
 * Used for configuration, integrations, policies, pipelines, and account settings.
 */
@Component({
  selector: "viking-form-template",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
  },
  template: `
    <form class="viking-form-template" novalidate (ngSubmit)="onSubmit($event)">
      @if (errorSummary()) {
        <div class="viking-form-template__error-summary" role="alert">
          <viking-icon
            class="viking-form-template__error-icon"
            name="alert-circle"
            [size]="20"
          />
          <div class="viking-form-template__error-content">
            <p class="viking-form-template__error-heading">
              {{ errorSummary()?.heading }}
            </p>
            @if (errorSummary()?.description) {
              <p class="viking-form-template__error-description">
                {{ errorSummary()?.description }}
              </p>
            }
          </div>
        </div>
      }

      @if (infoMessage()) {
        <div class="viking-form-template__info" role="status">
          <viking-icon
            class="viking-form-template__info-icon"
            name="info"
            [size]="20"
          />
          <p class="viking-form-template__info-text">{{ infoMessage() }}</p>
        </div>
      }

      <div class="viking-form-template__body">
        <ng-content />
      </div>

      <footer class="viking-form-template__actions">
        <ng-content select="[vikingFormActions]" />
      </footer>
    </form>
  `,
  styles: [
    `
      :host(.viking-form-template-wrapper) {
        display: block;
      }
      .viking-form-template {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
      }
      .viking-form-template__error-summary {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        background: color-mix(in srgb, var(--viking-danger) 8%, transparent);
        border: 1px solid var(--viking-danger-border, var(--viking-danger));
        border-radius: var(--viking-radius);
      }
      .viking-form-template__error-icon {
        color: var(--viking-danger);
        flex-shrink: 0;
        margin-top: var(--viking-space-0-5);
      }
      .viking-form-template__error-content {
        flex: 1;
      }
      .viking-form-template__error-heading {
        margin: 0;
        font-size: var(--viking-font-size);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-danger);
      }
      .viking-form-template__error-description {
        margin: var(--viking-space-0-5) 0 0;
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
      }
      .viking-form-template__info {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        background: color-mix(in srgb, var(--viking-accent) 8%, transparent);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
      }
      .viking-form-template__info-icon {
        color: var(--viking-accent);
        flex-shrink: 0;
        margin-top: var(--viking-space-0-5);
      }
      .viking-form-template__info-text {
        margin: 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
      }
      .viking-form-template__actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--viking-space-2);
        padding-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
    `,
  ],
})
export class VikingFormTemplate {
  readonly errorSummary = input<{
    heading: string;
    description?: string;
  } | null>(null);
  readonly infoMessage = input<string>("");
  readonly loading = input<boolean>(false);

  readonly submit = output<void>();
  readonly validSubmit = output<void>();

  private readonly hostRef = inject(ElementRef);

  protected readonly hostClass = computed(() =>
    [
      "viking-form-template-wrapper",
      this.loading() ? "viking-form-template--loading" : "",
    ].join(" "),
  );

  protected readonly formElements = viewChildren(
    "viking-field, viking-input, viking-select",
    {
      read: ElementRef,
    },
  );

  protected readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.submit.emit();
    // Focus first invalid field after submission
    this.focusFirstInvalid();
  };

  private focusFirstInvalid(): void {
    const elements = this.formElements();
    const firstInvalid = elements.find((el) => {
      const element = el.nativeElement as HTMLElement & {
        checkValidity?: () => boolean;
      };
      return (
        element.hasAttribute("data-invalid") ||
        (element.checkValidity && !element.checkValidity())
      );
    });
    if (firstInvalid) {
      setTimeout(() => {
        const input = firstInvalid.nativeElement.querySelector(
          "input, select, textarea",
        );
        if (input instanceof HTMLElement) {
          input.focus();
        } else {
          firstInvalid.nativeElement.focus();
        }
      });
    }
  }
}
