import { formatDate } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import type { VikingIconName } from "../../core/icons";
import type { VikingTone } from "../../core/types";

export type AnnouncementCardTone = "info" | "warning";

/**
 * AnnouncementCardComponent — system announcement block for status pages.
 *
 * @example
 * ```html
 * <viking-announcement-card
 *   tone="info"
 *   title="Sanity.io Integration Active"
 *   publishedAt="2026-06-13"
 * >
 *   Announcements are now served globally from edge CDNs.
 * </viking-announcement-card>
 * ```
 */
@Component({
  selector: "viking-announcement-card",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "article",
    "[class]": "hostClass()",
    "[attr.aria-label]": "ariaLabel()",
  },
  template: `
    <header class="viking-announcement-card-header">
      <div class="viking-announcement-card-meta">
        <span class="viking-announcement-card-tone">{{
          resolvedToneLabel()
        }}</span>
        @if (publishedText()) {
          <span class="viking-announcement-card-date">{{
            publishedText()
          }}</span>
        }
      </div>
      @if (showIcon()) {
        <viking-icon
          class="viking-announcement-card-icon"
          [name]="resolvedIcon()"
          [size]="20"
          [color]="iconColor()"
          aria-hidden="true"
        />
      }
    </header>
    @if (title()) {
      <h3 class="viking-announcement-card-title">{{ title() }}</h3>
    }
    <div class="viking-announcement-card-body">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
        padding: var(--viking-space-2) 0;
        color: var(--viking-text);
        box-sizing: border-box;
      }

      .viking-announcement-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-2);
        min-width: 0;
      }

      .viking-announcement-card-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-1);
        min-width: 0;
      }

      .viking-announcement-card-tone,
      .viking-announcement-card-date {
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-xs);
        line-height: var(--viking-line-height-snug);
      }

      .viking-announcement-card-tone {
        color: var(--viking-text-link);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
      }

      .viking-announcement-card-date::before {
        content: "/";
        margin-right: var(--viking-space-1);
        color: var(--viking-border-strong);
      }

      .viking-announcement-card-title {
        margin: 0;
        color: var(--viking-text);
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-bold);
        line-height: var(--viking-line-height-tight);
      }

      .viking-announcement-card-body {
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-sm);
        line-height: var(--viking-line-height-relaxed);
      }

      .viking-announcement-card-body ::ng-deep p {
        margin: 0;
      }

      :host(.viking-announcement-card-warning) .viking-announcement-card-tone,
      :host(.viking-announcement-card-warning) .viking-announcement-card-icon {
        color: var(--viking-warning);
      }
    `,
  ],
})
export class AnnouncementCardComponent {
  readonly tone = input<AnnouncementCardTone | VikingTone>("info");
  readonly title = input<string>("");
  readonly publishedAt = input<string | Date | null>(null);
  readonly publishedLabel = input<string>("");
  readonly icon = input<VikingIconName | string | null>(null);
  readonly showIcon = input<boolean>(false);

  protected readonly normalizedTone = computed<AnnouncementCardTone>(() =>
    this.tone() === "warning" ? "warning" : "info",
  );

  protected readonly resolvedToneLabel = computed(() => this.normalizedTone());

  protected readonly publishedText = computed(() => {
    if (this.publishedLabel()) {
      return this.publishedLabel();
    }
    const value = this.publishedAt();
    if (!value) {
      return "";
    }
    try {
      return `Published ${formatDate(value, "mediumDate", "en-US")}`;
    } catch {
      return `Published ${value}`;
    }
  });

  protected readonly resolvedIcon = computed<VikingIconName | string>(
    () =>
      this.icon() ||
      (this.normalizedTone() === "warning" ? "alert-triangle" : "info"),
  );

  protected readonly iconColor = computed(() =>
    this.normalizedTone() === "warning" ? "warning" : "info",
  );

  protected readonly hostClass = computed(
    () =>
      `viking-announcement-card viking-announcement-card-${this.normalizedTone()}`,
  );

  protected readonly ariaLabel = computed(() => {
    const title = this.title();
    const date = this.publishedText();
    return [title, date].filter(Boolean).join(", ") || "System announcement";
  });
}

export { AnnouncementCardComponent as VikingAnnouncementCard };
