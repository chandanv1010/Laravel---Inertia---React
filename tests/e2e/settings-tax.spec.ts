import { expect, test } from '@playwright/test';

test.describe('Settings - Tax', () => {
  test('can save tax settings and product pricing respects price-includes-tax', async ({ page }) => {
    test.setTimeout(120_000);

    // Open tax settings
    await page.goto('/backend/setting/tax');

    // Ensure enabled is ON (Radix checkbox is a button[role=checkbox])
    const enabled = page.locator('#enabled');
    if (!(await enabled.isChecked())) {
      await enabled.click({ force: true });
    }
    await expect(enabled).toBeChecked();

    // Ensure "price includes tax" is ON
    const includes = page.locator('#price_includes_tax');
    if (!(await includes.isChecked())) {
      await includes.click({ force: true });
    }
    await expect(includes).toBeChecked();

    // Set rates
    await page.locator('#purchase_tax_rate').fill('5');
    await page.locator('#sale_tax_rate').fill('10');

    // Save
    const resp = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/backend/setting/tax'));
    await page.getByRole('button', { name: /lưu cấu hình/i }).click();
    await resp;

    // Now product create should force apply_tax=1 and hide the switch
    await page.goto('/backend/product/create');

    // Switch should not exist when "price includes tax" is enabled
    await expect(page.locator('#apply_tax')).toHaveCount(0);

    // Hidden input still exists; it must be forced to 1
    const applyTaxVal = await page.locator('input[name="apply_tax"]').inputValue();
    expect(applyTaxVal).toBe('1');
  });
});

