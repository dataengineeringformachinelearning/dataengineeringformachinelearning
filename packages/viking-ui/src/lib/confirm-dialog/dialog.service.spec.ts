import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { VikingDialogService } from "./dialog.service";

describe("VikingDialogService", () => {
  it("updates an open confirm without replacing its pending resolver", async () => {
    const service = TestBed.inject(VikingDialogService);
    const result = service.openConfirm({
      title: "Session expiring soon",
      message: "3 seconds remaining",
      type: "confirm",
    });

    service.updateConfirm({ message: "2 seconds remaining" });

    expect(service.active()?.data?.message).toBe("2 seconds remaining");
    service.resolveConfirm(true);
    await expect(result).resolves.toBe(true);
  });
});
