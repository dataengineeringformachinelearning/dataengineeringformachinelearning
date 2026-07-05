import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", snapshot: "home.png" },
  { path: "/components", snapshot: "components-gallery.png" },
  { path: "/components/button", snapshot: "button-detail.png" },
  { path: "/playground", snapshot: "playground.png" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
});

for (const route of routes) {
  test(`${route.path} matches the Viking-UI visual baseline`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(route.snapshot, {
      fullPage: true,
    });
  });
}
