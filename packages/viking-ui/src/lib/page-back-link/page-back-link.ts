import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { Params, RouterLink } from "@angular/router";
import { VikingIcon } from "../icon/icon";

/**
 * viking-page-back-link — consistent dashboard back navigation with fixed spacing
 * below the control so page titles never sit flush against the link.
 */
@Component({
  selector: "viking-page-back-link",
  imports: [RouterLink, VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-page-back-link-host",
  },
  template: `
    <nav
      class="viking-page-back-nav page-back-nav"
      [attr.aria-label]="navLabel()"
    >
      <a
        class="viking-page-back-link back-link"
        [routerLink]="route()"
        [queryParams]="queryParams()"
        [attr.aria-label]="label()"
      >
        <viking-icon name="arrow-left" [size]="18" color="accent" />
        <span>{{ label() }}</span>
      </a>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .viking-page-back-nav {
        margin: 0;
        padding: 0;
      }

      .viking-page-back-link {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-0-5) 0;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-accent-strong);
        text-decoration: none;
        border-radius: var(--viking-radius-xs);
        transition: var(--viking-transition-interactive);
      }

      .viking-page-back-link:hover {
        color: var(--viking-accent);
      }

      .viking-page-back-link:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
    `,
  ],
})
export class VikingPageBackLink {
  readonly route = input<string | readonly string[]>("/dashboard");
  readonly queryParams = input<Params | null>(null);
  readonly label = input<string>("Back to Dashboard");
  readonly navLabel = input<string>("Return to dashboard");
}
