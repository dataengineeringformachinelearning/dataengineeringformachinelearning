import { afterEach, describe, expect, it, vi } from "vitest";
import { NativeDialogSession } from "./dialog-session";

describe("NativeDialogSession", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens via showModal and restores focus on close", () => {
    document.body.innerHTML = `
      <button type="button" id="trigger">Open</button>
      <dialog id="dlg"><button type="button" id="inside">Inside</button></dialog>
    `;
    const trigger = document.getElementById("trigger") as HTMLButtonElement;
    const dialog = document.getElementById("dlg") as HTMLDialogElement;
    trigger.focus();

    const session = new NativeDialogSession();
    const closed = vi.fn();

    session.syncOpen(dialog, true);
    expect(dialog.open).toBe(true);

    session.onNativeClose(closed);
    expect(closed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it("skips open when host is disconnected", () => {
    document.body.innerHTML = `<dialog id="dlg"></dialog>`;
    const dialog = document.getElementById("dlg") as HTMLDialogElement;
    const session = new NativeDialogSession();
    session.syncOpen(dialog, true, { connected: false });
    expect(dialog.open).toBe(false);
  });
});
