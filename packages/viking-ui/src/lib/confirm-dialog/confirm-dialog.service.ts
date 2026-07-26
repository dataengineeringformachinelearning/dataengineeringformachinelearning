import { Injectable, signal } from "@angular/core";

export interface VikingConfirmDialogData {
  title?: string;
  message: string;
  type?: "alert" | "confirm" | "prompt";
  confirmText?: string;
  confirmBtnText?: string;
  /** Secondary action label (confirm dialogs only). Defaults to "Cancel". */
  cancelBtnText?: string;
  confirmBtnColor?: "primary" | "warn" | "accent";
}

export type VikingOnboardingDialogData = {
  message: string;
  force?: boolean;
};

/** Discriminated active overlay — narrow with `kind` (no casts). */
export type VikingDialogState =
  | { kind: "confirm"; data: VikingConfirmDialogData }
  | { kind: "search" }
  | { kind: "onboarding"; data: VikingOnboardingDialogData };

/** @deprecated Prefer narrowing `VikingDialogState.kind`. */
export type VikingDialogKind = VikingDialogState["kind"];

/** Programmatic confirm / prompt / overlay orchestration for Viking-UI modals. */
@Injectable({ providedIn: "root" })
export class VikingDialogService {
  readonly active = signal<VikingDialogState | null>(null);

  private confirmResolver: ((value: boolean) => void) | null = null;
  private onboardingResolver: ((value: boolean | undefined) => void) | null =
    null;

  openConfirm(data: VikingConfirmDialogData): Promise<boolean> {
    this.closeActive(false);
    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
      this.active.set({ kind: "confirm", data });
    });
  }

  resolveConfirm(result: boolean): void {
    this.confirmResolver?.(result);
    this.confirmResolver = null;
    this.active.set(null);
  }

  /** Update an open confirm without replacing its pending promise resolver. */
  updateConfirm(data: Partial<VikingConfirmDialogData>): void {
    const active = this.active();
    if (active?.kind !== "confirm") {
      return;
    }
    this.active.set({
      kind: "confirm",
      data: { ...active.data, ...data },
    });
  }

  openSearch(): void {
    if (this.active()?.kind === "search") {
      return;
    }
    this.closeActive(false);
    this.active.set({ kind: "search" });
  }

  closeSearch(): void {
    if (this.active()?.kind === "search") {
      this.active.set(null);
    }
  }

  openOnboarding(force = false): Promise<boolean | undefined> {
    this.closeActive(false);
    return new Promise<boolean | undefined>((resolve) => {
      this.onboardingResolver = resolve;
      this.active.set({ kind: "onboarding", data: { message: "", force } });
    });
  }

  resolveOnboarding(result?: boolean): void {
    this.onboardingResolver?.(result);
    this.onboardingResolver = null;
    this.active.set(null);
  }

  closeActive(cancelPending = true): void {
    if (cancelPending) {
      this.confirmResolver?.(false);
      this.onboardingResolver?.(undefined);
    }
    this.confirmResolver = null;
    this.onboardingResolver = null;
    this.active.set(null);
  }
}
