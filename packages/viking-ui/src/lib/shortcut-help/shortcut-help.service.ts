import { Injectable, OnDestroy, signal } from "@angular/core";
import {
  bindShortcutHelpKey,
  getDefaultShortcutRegistry,
  type ShortcutRegistry,
} from "../../core/keyboard-shortcuts";

/**
 * Suite shortcut help — `?` opens the reference dialog (FORJD ADR-0023).
 */
@Injectable({ providedIn: "root" })
export class VikingShortcutHelpService implements OnDestroy {
  private readonly openSignal = signal(false);
  readonly open = this.openSignal.asReadonly();
  readonly registry: ShortcutRegistry = getDefaultShortcutRegistry();
  private readonly unbind: () => void;

  constructor() {
    this.unbind = bindShortcutHelpKey(() => this.show());
  }

  show(): void {
    this.openSignal.set(true);
  }

  hide(): void {
    this.openSignal.set(false);
  }

  setOpen(next: boolean): void {
    this.openSignal.set(next);
  }

  ngOnDestroy(): void {
    this.unbind();
  }
}
