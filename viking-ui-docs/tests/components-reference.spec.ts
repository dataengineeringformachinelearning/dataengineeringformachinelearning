import { expect, test } from "@playwright/test";

test("component anchors resolve on the single-page reference", async ({
  page,
}) => {
  await page.goto("/components#button");

  await expect(page.locator("#button")).toBeVisible();
  await expect(page).toHaveURL(/\/components#button$/);
  await expect(page.locator("#button .component-showcase-preview")).toBeVisible();
});

test("legacy component query routes normalize to anchors", async ({ page }) => {
  await page.goto("/components?component=button");

  await expect(page).toHaveURL(/\/components#button$/);
  await expect(page.locator("#button")).toBeVisible();
});

test("search filters components and categories", async ({ page }) => {
  await page.goto("/components");
  const search = page.getByLabel("Search components");

  await search.fill("app layout");

  await expect(page.locator("#app-layout")).toBeVisible();
  await expect(page.locator("#button")).toBeHidden();
  await expect(page.locator("#component-search-count")).toContainText("of");
});

test("framework tabs switch the copy-ready primary example", async ({
  page,
}) => {
  await page.goto("/components#button");
  const card = page.locator("#button");
  const webComponentTab = card.getByRole("tab", { name: "Web Component" });

  await webComponentTab.click();

  await expect(webComponentTab).toHaveAttribute("aria-selected", "true");
  await expect(
    card.locator('[data-compact-panel="web-component"]'),
  ).toBeVisible();
  await expect(card.getByText("Full API")).toBeVisible();
});
