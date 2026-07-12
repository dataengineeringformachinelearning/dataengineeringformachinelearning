import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingPageTemplateDensity = "compact" | "default" | "loose";
export type VikingPageTemplateWidth = "narrow" | "default" | "wide" | "full";

/** Route template with explicit header, actions, content, and footer regions. */
@Component({
  selector: "viking-page-template",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `
    <div class="page-inner-wrapper viking-page-template__inner">
      @if (headerContent()) {
        <header class="viking-page-template__header">
          <div class="viking-page-template__heading">
            <ng-content select="[vikingPageTemplateHeader]" />
          </div>
          <div class="viking-page-template__actions">
            <ng-content select="[vikingPageTemplateActions]" />
          </div>
        </header>
      }
      <div class="viking-page-template__content">
        <ng-content select="[vikingPageTemplateContent]" />
        <ng-content />
      </div>
      @if (footerContent()) {
        <footer class="viking-page-template__footer">
          <ng-content select="[vikingPageTemplateFooter]" />
        </footer>
      }
    </div>
  `,
})
export class VikingPageTemplate {
  readonly density = input<VikingPageTemplateDensity>("default");
  readonly width = input<VikingPageTemplateWidth>("default");
  readonly headerContent = input<boolean>(false);
  readonly footerContent = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-page-template",
      `viking-page-template--${this.width()}`,
      `viking-page-template--${this.density()}`,
    ].join(" "),
  );
}
