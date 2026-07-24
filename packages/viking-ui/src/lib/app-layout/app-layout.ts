import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from "@angular/core";
import { VikingIconComponent } from "../icon/icon";

export type VikingAppLayoutDensity = "compact" | "default" | "loose";
export type VikingSplitPanelSize = "compact" | "default" | "large";

/** Declarative drawer entry selected by viking-app-layout.activeDrawerId. */
@Component({
  selector: "viking-app-layout-drawer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-app-layout-drawer",
    "[attr.hidden]": "active() ? null : ''",
  },
  template: `<ng-content />`,
})
export class VikingAppLayoutDrawer {
  readonly drawerId = input.required<string>();
  readonly label = input<string>("Contextual drawer");
  readonly active = signal<boolean>(false);
}

/** Responsive application shell with independently collapsible navigation and tools. */
@Component({
  selector: "viking-app-layout",
  standalone: true,
  imports: [VikingIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
    "[attr.data-density]": "densityContext()",
  },
  template: `
    @if (hasSidebar()) {
      <aside
        id="viking-app-layout-sidebar"
        class="viking-app-layout__sidebar"
        [class.viking-app-layout__sidebar--open]="sidebarOpen()"
        [attr.aria-hidden]="!sidebarOpen()"
        aria-label="Primary navigation"
      >
        <ng-content select="[vikingAppLayoutSidebar]" />
      </aside>
    }

    <div class="viking-app-layout__main">
      @if (
        headerContent() ||
        (hasSidebar() && sidebarCollapsible()) ||
        (toolsVisible() && toolsCollapsible())
      ) {
        <header class="viking-app-layout__header">
          @if (hasSidebar() && sidebarCollapsible()) {
            <button
              class="viking-app-layout__toggle"
              type="button"
              aria-label="Toggle navigation"
              aria-controls="viking-app-layout-sidebar"
              [attr.aria-expanded]="sidebarOpen()"
              (click)="toggleSidebar()"
            >
              <viking-icon name="menu" [size]="20" [ariaHidden]="true" />
            </button>
          }
          <div class="viking-app-layout__header-content">
            <ng-content select="[vikingAppLayoutHeader]" />
          </div>
          @if (toolsVisible() && toolsCollapsible()) {
            <button
              class="viking-app-layout__toggle"
              type="button"
              aria-label="Toggle tools panel"
              aria-controls="viking-app-layout-tools"
              [attr.aria-expanded]="toolsOpen()"
              (click)="toggleTools()"
            >
              <viking-icon name="settings" [size]="20" [ariaHidden]="true" />
            </button>
          }
        </header>
      }

      <div class="viking-app-layout__content">
        <div class="viking-app-layout__notifications">
          <ng-content select="[vikingAppLayoutNotifications]" />
        </div>
        <div class="viking-app-layout__breadcrumbs">
          <ng-content select="[vikingAppLayoutBreadcrumbs]" />
        </div>
        <ng-content select="[vikingAppLayoutContent]" />
      </div>

      @if (hasSplitPanel()) {
        <section
          id="viking-app-layout-split-panel"
          class="viking-app-layout__split-panel"
          [class.viking-app-layout__split-panel--open]="splitPanelOpen()"
          [attr.aria-hidden]="!splitPanelOpen()"
          [attr.aria-label]="splitPanelLabel()"
        >
          <header class="viking-app-layout__split-panel-header">
            <span>{{ splitPanelLabel() }}</span>
            <button
              class="viking-app-layout__toggle"
              type="button"
              aria-label="Close split panel"
              aria-controls="viking-app-layout-split-panel"
              [attr.aria-expanded]="splitPanelOpen()"
              (click)="toggleSplitPanel()"
            >
              <viking-icon name="x" [size]="20" [ariaHidden]="true" />
            </button>
          </header>
          <div class="viking-app-layout__split-panel-body">
            <ng-content select="[vikingAppLayoutSplitPanel]" />
          </div>
        </section>
      }

      @if (footerContent()) {
        <footer class="viking-app-layout__footer">
          <ng-content select="[vikingAppLayoutFooter]" />
        </footer>
      }
    </div>

    @if (toolsVisible()) {
      <aside
        id="viking-app-layout-tools"
        class="viking-app-layout__tools"
        [class.viking-app-layout__tools--open]="toolsOpen()"
        [attr.aria-hidden]="!toolsOpen()"
        aria-label="Contextual tools"
      >
        <ng-content
          select="[vikingAppLayoutTools], [vikingAppLayoutTrailing]"
        />
      </aside>
    }

    @if (activeDrawerId()) {
      <aside
        id="viking-app-layout-drawer"
        class="viking-app-layout__drawer"
        [attr.aria-label]="resolvedDrawerLabel()"
      >
        <header class="viking-app-layout__drawer-header">
          <span>{{ resolvedDrawerLabel() }}</span>
          <button
            class="viking-app-layout__toggle"
            type="button"
            aria-label="Close drawer"
            aria-controls="viking-app-layout-drawer"
            (click)="closeDrawer()"
          >
            <viking-icon name="x" [size]="20" [ariaHidden]="true" />
          </button>
        </header>
        <div class="viking-app-layout__drawer-body">
          <ng-content
            select="viking-app-layout-drawer, [vikingAppLayoutDrawer]"
          />
        </div>
      </aside>
    }

    @if (
      (hasSidebar() && sidebarOpen()) ||
      (toolsVisible() && toolsOpen()) ||
      activeDrawerId()
    ) {
      <button
        class="viking-app-layout__scrim"
        type="button"
        aria-label="Close application panels"
        (click)="closePanels()"
      ></button>
    }
  `,
})
export class VikingAppLayout {
  private readonly destroyRef = inject(DestroyRef);

  readonly hasSidebar = input<boolean>(false);
  readonly hasTools = input<boolean>(false);
  /** @deprecated Use hasTools. */
  readonly hasTrailingSidebar = input<boolean>(false);
  readonly headerContent = input<boolean>(false);
  readonly footerContent = input<boolean>(false);
  readonly sidebarCollapsible = input<boolean>(true);
  readonly toolsCollapsible = input<boolean>(true);
  readonly autoOpenSidebar = input<boolean>(true);
  readonly hasSplitPanel = input<boolean>(false);
  readonly splitPanelLabel = input<string>("Details");
  readonly splitPanelSize = input<VikingSplitPanelSize>("default");
  readonly drawerLabel = input<string>("Contextual drawer");
  readonly density = input<VikingAppLayoutDensity>("default");
  readonly sidebarOpen = model<boolean>(false);
  readonly toolsOpen = model<boolean>(false);
  readonly splitPanelOpen = model<boolean>(false);
  readonly activeDrawerId = model<string | null>(null);
  readonly sidebarToggle = output<boolean>();
  readonly toolsToggle = output<boolean>();
  readonly splitPanelToggle = output<boolean>();
  readonly drawerChange = output<string | null>();
  private readonly drawers = contentChildren(VikingAppLayoutDrawer, {
    descendants: true,
  });
  protected readonly toolsVisible = computed(
    () => this.hasTools() || this.hasTrailingSidebar(),
  );
  protected readonly densityContext = computed(() =>
    this.density() === "loose" ? "comfortable" : this.density(),
  );
  protected readonly resolvedDrawerLabel = computed(
    () =>
      this.drawers()
        .find((drawer) => drawer.drawerId() === this.activeDrawerId())
        ?.label() ?? this.drawerLabel(),
  );

  constructor() {
    effect(() => {
      const activeId = this.activeDrawerId();
      for (const drawer of this.drawers()) {
        drawer.active.set(drawer.drawerId() === activeId);
      }
    });
    afterNextRender(() => {
      const desktopQuery = window.matchMedia("(min-width: 1024px)");
      const syncSidebarForViewport = (
        event: MediaQueryList | MediaQueryListEvent,
      ): void => {
        if (this.autoOpenSidebar()) {
          this.sidebarOpen.set(event.matches);
        }
      };

      syncSidebarForViewport(desktopQuery);
      desktopQuery.addEventListener("change", syncSidebarForViewport);
      this.destroyRef.onDestroy(() => {
        desktopQuery.removeEventListener("change", syncSidebarForViewport);
      });
    });
  }

  protected readonly hostClass = computed(() =>
    [
      "viking-app-layout",
      `viking-app-layout--${this.density()}`,
      this.hasSidebar() && this.sidebarOpen()
        ? "viking-app-layout--sidebar-open"
        : "",
      this.toolsVisible() && this.toolsOpen()
        ? "viking-app-layout--tools-open"
        : "",
      this.hasSplitPanel()
        ? `viking-app-layout--split-panel-${this.splitPanelSize()}`
        : "",
      this.hasSidebar() &&
      this.sidebarCollapsible() &&
      !this.headerContent() &&
      !(this.toolsVisible() && this.toolsCollapsible())
        ? "viking-app-layout--sidebar-toggle-only"
        : "",
      this.splitPanelOpen() ? "viking-app-layout--split-panel-open" : "",
      this.activeDrawerId() ? "viking-app-layout--drawer-open" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  protected readonly toggleSidebar = (): void => {
    const next = !this.sidebarOpen();
    this.sidebarOpen.set(next);
    this.sidebarToggle.emit(next);
  };

  protected readonly toggleTools = (): void => {
    const next = !this.toolsOpen();
    this.toolsOpen.set(next);
    this.toolsToggle.emit(next);
  };

  protected readonly closePanels = (): void => {
    this.sidebarOpen.set(false);
    this.toolsOpen.set(false);
    this.closeDrawer();
  };

  protected readonly toggleSplitPanel = (): void => {
    const next = !this.splitPanelOpen();
    this.splitPanelOpen.set(next);
    this.splitPanelToggle.emit(next);
  };

  protected readonly closeDrawer = (): void => {
    this.activeDrawerId.set(null);
    this.drawerChange.emit(null);
  };
}
