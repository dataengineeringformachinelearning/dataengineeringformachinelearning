export const applyTheme = (theme: "light" | "dark"): void => {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
};

export const readTheme = (): "light" | "dark" => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const initThemeToggle = (): void => {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn || btn.hasAttribute("data-theme-bound")) return;
  btn.setAttribute("data-theme-bound", "true");
  btn.addEventListener("click", () => {
    const next = readTheme() === "light" ? "dark" : "light";
    applyTheme(next);
  });
};

document.addEventListener("DOMContentLoaded", initThemeToggle);
