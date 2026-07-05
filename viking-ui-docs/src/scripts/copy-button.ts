import { initThemeToggle } from "./theme";

export const initCopyButtons = (): void => {
  document.querySelectorAll("[data-copy-btn]").forEach((btn) => {
    if (btn.hasAttribute("data-copy-bound")) return;
    btn.setAttribute("data-copy-bound", "true");
    btn.addEventListener("click", async () => {
      const block = btn.closest("[data-code-block]");
      const code = block?.querySelector(
        "[data-panel].is-active code, pre.is-active code",
      );
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
        const label = btn.querySelector(".code-block-copy-label");
        if (label) {
          label.textContent = "Copied!";
          setTimeout(() => {
            label.textContent = "Copy";
          }, 2000);
        }
      } catch {
        /* noop */
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initCopyButtons();
});
