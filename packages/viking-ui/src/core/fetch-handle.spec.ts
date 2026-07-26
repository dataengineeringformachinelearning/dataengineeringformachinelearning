import { describe, expect, it } from "vitest";

import { createFetchHandle, fetchErrorMessage } from "./fetch-handle";

describe("fetchErrorMessage", () => {
  it("prefers Error.message and string causes", () => {
    expect(fetchErrorMessage(new Error("boom"))).toBe("boom");
    expect(fetchErrorMessage("nope")).toBe("nope");
    expect(fetchErrorMessage(null, "fallback")).toBe("fallback");
  });
});

describe("createFetchHandle", () => {
  it("runs loading → success for a throwing fetcher", async () => {
    const handle = createFetchHandle<number>();
    const pending = handle.run(async () => 42);
    expect(handle.isLoading()).toBe(true);
    await expect(pending).resolves.toBe(42);
    expect(handle.isSuccess()).toBe(true);
    expect(handle.data()).toBe(42);
  });

  it("settles soft domain outcomes without throwing", async () => {
    const handle = createFetchHandle<"ok", "offline">({
      initialPhase: "loading",
    });
    await handle.runSettled(async () => ({ ok: false, error: "offline" }));
    expect(handle.isError()).toBe(true);
    expect(handle.error()).toBe("offline");
  });

  it("fail() forces error without a round-trip", () => {
    const handle = createFetchHandle<"ok", "offline">();
    handle.fail("offline");
    expect(handle.isError()).toBe(true);
  });
});
