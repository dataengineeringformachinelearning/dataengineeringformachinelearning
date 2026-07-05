import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

/**
 * viking-sidebar-nav — composable sidebar navigation container.
 */
@Component({
  selector: "viking-sidebar-nav",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "viking-sidebar-nav",
    role: "navigation",
  },
  template: `<ng-content />`,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNav {}

/**
 * viking-sidebar-nav-link — router-aware sidebar nav item.
 */
@Component({
  selector: "viking-sidebar-nav-link",
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "viking-sidebar-nav-link",
  },
  template: `
    <a
      [routerLink]="routerLink()"
      routerLinkActive="viking-sidebar-nav-link-active"
      [routerLinkActiveOptions]="routerLinkActiveOptions()"
      [title]="title()"
      [attr.aria-label]="title() || null"
    >
      <ng-content />
    </a>
  `,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNavLink {
  readonly routerLink = input.required<string | string[]>();
  readonly routerLinkActiveOptions = input<{ exact: boolean }>({ exact: true });
  readonly title = input<string>("");
}

/**
 * viking-sidebar-nav-tree — expandable tree section within sidebar nav.
 */
@Component({
  selector: "viking-sidebar-nav-tree",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: "viking-sidebar-nav-tree" },
  template: `<ng-content />`,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNavTree {}

/**
 * viking-sidebar-nav-tree-header — collapsible tree section header.
 */
@Component({
  selector: "viking-sidebar-nav-tree-header",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "viking-sidebar-nav-tree-header",
    role: "button",
    tabindex: "0",
    "[attr.aria-expanded]": "expanded()",
    "(click)": "onToggle()",
    "(keydown.enter)": "onToggle()",
    "(keydown.space)": "onSpace($event)",
  },
  template: `
    <span class="viking-sidebar-nav-tree-label">{{ label() }}</span>
    <ng-content select="[vikingSidebarTreeArrow]" />
  `,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNavTreeHeader {
  readonly label = input.required<string>();
  readonly expanded = input<boolean>(true);
  readonly toggled = output<void>();

  protected onToggle = (): void => {
    this.toggled.emit();
  };

  protected onSpace = (event: Event): void => {
    event.preventDefault();
    this.onToggle();
  };
}

/**
 * viking-sidebar-nav-tree-children — tree item list container.
 */
@Component({
  selector: "viking-sidebar-nav-tree-children",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: "viking-sidebar-nav-tree-children" },
  template: `<ng-content />`,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNavTreeChildren {}

export type VikingSidebarNavTreeItemVariant = "default" | "empty" | "accent";

/**
 * viking-sidebar-nav-tree-item — selectable tree leaf or action row.
 */
@Component({
  selector: "viking-sidebar-nav-tree-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: "viking-sidebar-nav-tree-item",
    role: "button",
    tabindex: "0",
    "[class.viking-sidebar-nav-tree-item-active]": "active()",
    "[class.viking-sidebar-nav-tree-item-empty]": "variant() === 'empty'",
    "[class.viking-sidebar-nav-tree-item-accent]": "variant() === 'accent'",
    "(click)": "onActivate($event)",
    "(keydown.enter)": "onActivate($event)",
    "(keydown.space)": "onSpace($event)",
  },
  template: `<ng-content />`,
  styleUrl: "./sidebar-nav.scss",
})
export class VikingSidebarNavTreeItem {
  readonly active = input<boolean>(false);
  readonly variant = input<VikingSidebarNavTreeItemVariant>("default");
  readonly activated = output<void>();

  protected onActivate = (event: Event): void => {
    if (this.variant() === "empty") {
      return;
    }
    this.activated.emit();
  };

  protected onSpace = (event: Event): void => {
    event.preventDefault();
    this.onActivate(event);
  };
}
