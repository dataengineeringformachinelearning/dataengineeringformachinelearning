import { expect, test } from "@playwright/test";

test("component detail routes expose the live preview", async ({ page }) => {
  await page.goto("/components/button");

  await expect(page.locator("#button")).toBeVisible();
  await expect(page).toHaveURL(/\/components\/button$/);
  await expect(
    page.locator("#button .component-showcase-preview"),
  ).toBeVisible();
});

test("gallery cards link to their dedicated component routes", async ({
  page,
}) => {
  await page.goto("/components");

  await expect(page.locator("#button")).toBeVisible();
  await expect(
    page.locator("#button").getByRole("link", { name: "Button", exact: true }),
  ).toHaveAttribute("href", "/components/button");
});

test("search filters components and categories", async ({ page }) => {
  await page.goto("/components");
  const search = page.getByLabel("Search components");

  await search.fill("layout");

  await expect(page.locator("#layout")).toBeVisible();
  await expect(page.locator("#button")).toBeHidden();
  await expect(page.locator("#component-search-count")).toContainText("of");
});

test("framework tabs switch the copy-ready primary example", async ({
  page,
}) => {
  await page.goto("/components/button");
  const card = page.locator("#button");
  const webComponentTab = card.getByRole("tab", { name: "Web Component" });

  await webComponentTab.click();

  await expect(webComponentTab).toHaveAttribute("aria-selected", "true");
  await expect(card.locator('[data-panel="javascript"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "API reference" }),
  ).toBeVisible();
});
