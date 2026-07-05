import { describe, it, expect } from "vitest";
import {
  MATERIAL_ICON_ALIASES,
  VIKING_ICON_PATHS,
  resolveVikingIcon,
  resolveVikingIconColor,
  resolveVikingIconSize,
  vikingIconViewBox,
} from "./icons";

describe("icons registry", () => {
  it("resolves direct icon names case-insensitively", () => {
    expect(resolveVikingIcon("search")).toBe("search");
    expect(resolveVikingIcon("Shield")).toBe("shield");
  });

  it("maps legacy Material icon ligatures to Viking keys", () => {
    expect(resolveVikingIcon("trending_up")).toBe("trending-up");
    expect(resolveVikingIcon("verified_user")).toBe("user-shield");
    expect(MATERIAL_ICON_ALIASES["rocket_launch"]).toBe("rocket");
  });

  it("falls back to info for unknown names", () => {
    expect(resolveVikingIcon("does-not-exist")).toBe("info");
  });

  it("resolves size presets to pixel dimensions", () => {
    expect(resolveVikingIconSize(undefined, "sm")).toBe(16);
    expect(resolveVikingIconSize(undefined, "md")).toBe(20);
    expect(resolveVikingIconSize(undefined, "lg")).toBe(24);
    expect(resolveVikingIconSize(28, null)).toBe(28);
    expect(resolveVikingIconSize(undefined, null)).toBe(24);
  });

  it("maps semantic color tokens to CSS custom properties", () => {
    expect(resolveVikingIconColor("accent")).toBe("var(--viking-accent)");
    expect(resolveVikingIconColor("danger")).toBe("var(--viking-danger)");
    expect(resolveVikingIconColor("inherit")).toBeUndefined();
    expect(resolveVikingIconColor("var(--custom)")).toBe("var(--custom)");
  });

  it("uses a consistent 24×24 viewBox for registry icons", () => {
    expect(vikingIconViewBox("check")).toBe("0 0 24 24");
    expect(vikingIconViewBox("drakkar")).toBe("0 0 24 24");
  });

  it("registers core Lucide and brand icons", () => {
    expect(VIKING_ICON_PATHS["search"]).toBeTruthy();
    expect(VIKING_ICON_PATHS["drakkar"]).toBeTruthy();
    expect(VIKING_ICON_PATHS["deml"]).toBeTruthy();
  });
});
