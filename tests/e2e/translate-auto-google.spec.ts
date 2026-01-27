import { expect, test } from '@playwright/test';

test.describe('Translate - Auto Google', () => {
  test('toggling auto-translate does not require name', async ({ page }) => {
    test.setTimeout(120_000);

    // Open product list and navigate to a translate page via language flags
    await page.goto('/backend/product');
    const firstRow = page.locator('tbody tr').first();
    // languages column is the 5th cell (0-based: 4)
    const langCell = firstRow.locator('td').nth(4);
    const firstLangButton = langCell.locator('button[type="button"]').first();
    await firstLangButton.click({ force: true });
    await page.waitForURL('**/backend/product/**/translate/**', { timeout: 30_000 });

    const toggle = page.locator('#auto-translate');
    await expect(toggle).toBeVisible();

    // Toggle ON (should PATCH only auto_translate; must not trigger name required error)
    await toggle.click({ force: true });

    // No validation error should appear
    await expect(page.getByText('Tiêu đề là bắt buộc')).toHaveCount(0);

    // After reload, switch should stay checked
    await expect(toggle).toBeChecked({ timeout: 15_000 });
  });
});

