import { test, expect } from "@chromatic-com/playwright";

test.describe("Backend landing (backend.deml.app)", () => {
  test("home page hero and feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Data Engineering",
    );
    await expect(
      page.getByRole("link", { name: /Swagger Docs/i }),
    ).toBeVisible();
    await expect(page.locator("viking-card-wc")).toHaveCount(3);
  });

  test("OpenAPI docs shell", async ({ page }) => {
    await page.goto("/api/v1/docs");
    await expect(page.locator(".backend-swagger-panel")).toBeVisible();
    await expect(page.getByLabel("Search endpoints")).toBeVisible();
    await expect(page.locator("#swagger-ui")).toBeVisible();
  });
});
