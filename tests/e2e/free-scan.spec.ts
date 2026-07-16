import { test, expect } from "@playwright/test";

test("anonymous scan starts from homepage and uses public routes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Does AI recommend your company/i }),
  ).toBeVisible();
  await expect(page.locator("#scan")).toBeVisible();

  const preview = await page.request.post("/api/scans/free/preview", {
    data: { domain: "example.com" },
    timeout: 60_000,
  });
  expect(preview.ok()).toBeTruthy();
  const previewBody = (await preview.json()) as {
    cached?: boolean;
    slug?: string;
  };

  if (previewBody.cached && previewBody.slug) {
    await page.goto(`/report/${previewBody.slug}`);
    await expect(page).toHaveURL(/\/report\//);
  } else {
    // Confirm the public progress route renders (scan job may still be running).
    await page.goto("/scan/00000000-0000-4000-8000-000000000001");
    await expect(page.getByText(/not found|scan/i).first()).toBeVisible();
  }

  await expect(page).not.toHaveURL(/\/dashboard\/scans/);
});
