import { expect, test } from "@playwright/test"

test.describe("/demo — timer flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo")
  })

  test("page loads with a start button visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /start/i })).toBeVisible()
  })

  test("start then stop creates a time block entry", async ({ page }) => {
    await page.getByRole("button", { name: /start/i }).click()
    await expect(page.getByRole("button", { name: /stop/i })).toBeVisible()

    await page.getByRole("button", { name: /stop/i }).click()
    await expect(page.getByRole("button", { name: /start/i })).toBeVisible()
  })
})

test.describe("/demo — manual block entry", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo")
  })

  test("can open the manual log form", async ({ page }) => {
    const logButton = page.getByRole("button", { name: /log block|add block|manual/i })
    await expect(logButton).toBeVisible()
    await logButton.click()
    await expect(page.getByRole("textbox", { name: /task|what/i })).toBeVisible()
  })
})
