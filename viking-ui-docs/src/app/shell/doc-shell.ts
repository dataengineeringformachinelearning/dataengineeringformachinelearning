import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import {
  VikingAppSidebar,
  VikingButton,
  VikingIcon,
  VikingSiteNavbar,
} from "@dataengineeringformachinelearning/viking-ui";
import { ToastOutlet } from "../toast-outlet";

const readTheme = (): "light" | "dark" => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/** Persistent doc-site chrome — Drakkar navbar + dashboard sidebar shell. */
@Component({
  selector: "app-doc-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    VikingAppSidebar,
    VikingButton,
    VikingIcon,
    VikingSiteNavbar,
    ToastOutlet,
  ],
  templateUrl: "./doc-shell.html",
  styleUrl: "./doc-shell.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocShell {
  protected readonly theme = signal<"light" | "dark">(readTheme());

  constructor(private readonly router: Router) {}

  protected readonly navSections = [
    { id: "cat-foundations", label: "Foundations" },
    { id: "cat-shell", label: "Application Shell" },
    { id: "cat-auth", label: "Authentication" },
    { id: "cat-forms", label: "Forms & Inputs" },
    { id: "cat-overlays", label: "Feedback & Overlays" },
    { id: "cat-nav", label: "Navigation" },
    { id: "cat-data", label: "Data Visualization" },
    { id: "cat-content", label: "Content & Media" },
    { id: "cat-marketing", label: "Marketing" },
    { id: "cat-drakkar", label: "Drakkar Shell" },
  ] as const;

  protected browseComponents = (): void => {
    void this.router.navigate(["/components"]);
  };

  protected scrollToCategory = (event: Event, sectionId: string): void => {
    event.preventDefault();
    void this.router
      .navigate(["/components"], { fragment: sectionId })
      .then(() => {
        requestAnimationFrame(() => this.focusCategory(sectionId));
      });
  };

  protected toggleTheme = (): void => {
    const next = this.theme() === "light" ? "dark" : "light";
    this.theme.set(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  };

  private focusCategory = (sectionId: string): void => {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `/components#${sectionId}`);
  };
}
