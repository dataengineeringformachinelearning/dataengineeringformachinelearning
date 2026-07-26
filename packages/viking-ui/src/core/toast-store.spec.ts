import { describe, expect, it, vi } from "vitest";
import {
  createToastStore,
  toastPriorityFromTone,
  type ToastPriority,
} from "./toast-store";

type Msg = {
  id: number;
  text: string;
  priority: ToastPriority;
  dedupeKey?: string;
};

describe("createToastStore", () => {
  it("queues and auto-dismisses", () => {
    vi.useFakeTimers();
    const store = createToastStore<Msg>({ defaultDurationMs: 1000 });
    store.add({ id: store.nextId(), text: "a", priority: "normal" }, 250);
    expect(store.messages()).toHaveLength(1);
    vi.advanceTimersByTime(250);
    expect(store.messages()).toHaveLength(0);
    vi.useRealTimers();
  });

  it("orders by priority and caps visible stack", () => {
    const store = createToastStore<Msg>({ maxVisible: 2 });
    store.add({ id: store.nextId(), text: "low", priority: "low" }, 0);
    store.add({ id: store.nextId(), text: "normal", priority: "normal" }, 0);
    store.add(
      { id: store.nextId(), text: "critical", priority: "critical" },
      0,
    );
    expect(store.messages().map((m) => m.text)).toEqual(["critical", "normal"]);
  });

  it("dedupes by key", () => {
    const store = createToastStore<Msg>();
    store.add(
      {
        id: store.nextId(),
        text: "saving",
        priority: "normal",
        dedupeKey: "save",
      },
      0,
    );
    store.add(
      {
        id: store.nextId(),
        text: "saved",
        priority: "low",
        dedupeKey: "save",
      },
      0,
    );
    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.text).toBe("saved");
  });

  it("maps tones to default priorities", () => {
    expect(toastPriorityFromTone("danger")).toBe("critical");
    expect(toastPriorityFromTone("success")).toBe("low");
  });
});
