import { test, expect } from "@chromatic-com/playwright";

test.describe("Viking-UI docs showcase", () => {
  test("docs home page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("main, .page-inner-wrapper").first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("components index", async ({ page }) => {
    await page.goto("/components/");
    await expect(page.locator(".showcase-page, main").first()).toBeVisible();
  });
});
