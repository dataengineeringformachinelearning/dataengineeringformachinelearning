import { test, expect } from "@chromatic-com/playwright";

test.describe("Backend landing (backend.deml.app)", () => {
  test("home page hero and feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "DEML Backend API",
    );
    await expect(
      page.getByRole("heading", { name: "Live platform health" }),
    ).toBeVisible();
    await expect(page.locator(".backend-health-metric")).toHaveCount(4);
    await expect(
      page.getByRole("link", { name: /Swagger Docs/i }),
    ).toBeVisible();
    await expect(page.locator(".viking-feature-panel")).toHaveCount(3);
  });

  test("OpenAPI docs shell", async ({ page }) => {
    await page.goto("/api/v1/docs");
    await expect(page.locator(".backend-swagger-panel")).toBeVisible();
    await expect(page.getByLabel("Search endpoints")).toBeVisible();
    await expect(page.locator("#swagger-ui")).toBeVisible();
  });
});
