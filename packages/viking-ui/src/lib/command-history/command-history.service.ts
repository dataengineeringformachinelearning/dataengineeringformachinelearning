import { isPlatformBrowser } from "@angular/common";
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  getDefaultCommandHistory,
  type RunHistoryCommand,
} from "../../core/command-history";
import { VikingToastService } from "../toast/toast";

/**
 * Suite command history — ⌘Z / ⌘⇧Z for reversible client actions (FORJD ADR-0019).
 * Shortcuts bind once via `getDefaultCommandHistory()`.
 */
@Injectable({ providedIn: "root" })
export class VikingCommandHistoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(VikingToastService);
  private readonly history = getDefaultCommandHistory();
  private readonly version = signal(0);

  readonly canUndo = computed(() => {
    this.version();
    return this.history.canUndo();
  });
  readonly canRedo = computed(() => {
    this.version();
    return this.history.canRedo();
  });
  readonly undoLabel = computed(() => {
    this.version();
    return this.history.undoLabel();
  });
  readonly redoLabel = computed(() => {
    this.version();
    return this.history.redoLabel();
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const unsub = this.history.subscribe(() => {
      this.version.update((n) => n + 1);
    });
    this.destroyRef.onDestroy(() => {
      unsub();
    });
  }

  run(command: RunHistoryCommand): Promise<void> {
    return this.history.run(command);
  }

  async runWithUndoToast(
    command: RunHistoryCommand,
    opts?: { readonly text?: string; readonly duration?: number },
  ): Promise<void> {
    await this.history.run(command);
    this.toast.show({
      heading: command.label,
      text: opts?.text ?? "Press ⌘Z to undo",
      tone: "accent",
      priority: "high",
      duration: opts?.duration ?? 6000,
      action: {
        label: "Undo",
        onClick: () => {
          void this.undo();
        },
      },
    });
  }

  undo(): Promise<boolean> {
    return this.history.undo();
  }

  redo(): Promise<boolean> {
    return this.history.redo();
  }

  clear(): void {
    this.history.clear();
  }
}
