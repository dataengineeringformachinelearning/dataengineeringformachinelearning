import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import {
  VikingBrand,
  VikingButton,
  VikingText,
} from "@dataengineeringformachinelearning/viking-ui";

/** Persistent doc-site chrome — sidebar navigation like spartan.ng. */
@Component({
  selector: "app-doc-shell",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    VikingBrand,
    VikingButton,
    VikingText,
  ],
  templateUrl: "./doc-shell.html",
  styleUrl: "./doc-shell.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocShell {
  private readonly router = inject(Router);

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

  protected scrollToCategory = (event: Event, sectionId: string): void => {
    event.preventDefault();
    void this.router
      .navigate(["/components"], { fragment: sectionId })
      .then(() => {
        requestAnimationFrame(() => this.focusCategory(sectionId));
      });
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
