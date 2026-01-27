import { expect, test } from '@playwright/test';

function nowId() {
  return Date.now();
}

async function createBaseProduct(page: any, prefix: string) {
  const name = `E2E[UI:${prefix}] Product ${nowId()}`;
  await page.goto('/backend/product/create');
  await page.locator('[data-testid="product-name"]').fill(name);
  await page.locator('[data-testid="seo-toggle"]').click();
  await page.locator('[data-testid="product-canonical"]').fill(`e2e-ui-${prefix.toLowerCase()}-${nowId()}`);
  return name;
}

async function saveAndGoIndex(page: any) {
  const saveResponse = page.waitForResponse((resp: any) => {
    if (resp.request().method() !== 'POST') return false;
    // match store/update endpoints only
    if (!/\/backend\/product(\/\d+)?$/.test(resp.url())) return false;
    return resp.status() === 302 || resp.status() === 303;
  });
  await page.locator('[data-testid="product-save-close"]').click();
  await saveResponse;
  await page.goto('/backend/product');
}

async function searchAndOpenEdit(page: any, name: string) {
  await page.getByRole('textbox', { name: 'Nhập từ khóa muốn tìm kiếm' }).fill(name);
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByText(name).first()).toBeVisible();
  const row = page.locator('tr', { hasText: name }).first();
  await row.locator('a[href*="/backend/product/"][href$="/edit"]').first().click();
}

test.describe('Product UI blocks', () => {
  test('Load demo button fills form and can save', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/backend/product/create');
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await page.getByRole('button', { name: 'Load demo' }).click();
    // canonical should be set by demo
    await page.locator('[data-testid="seo-toggle"]').click();
    await expect(page.locator('[data-testid="product-canonical"]')).toHaveValue(/demo-product-/);
    await saveAndGoIndex(page);
    // verify at least one DEMO product exists in list (by search using prefix)
    await page.getByRole('textbox', { name: 'Nhập từ khóa muốn tìm kiếm' }).fill('DEMO Product');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(page.getByText(/DEMO Product/i).first()).toBeVisible();
  });

  test('Tax setting "price includes tax" hides product apply-tax switch', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/backend/setting/tax');
    // Ensure enabled and includes-tax are ON
    if (!(await page.locator('#enabled').isChecked())) {
      await page.locator('#enabled').click();
    }
    if (!(await page.locator('#price_includes_tax').isChecked())) {
      await page.locator('#price_includes_tax').click();
    }
    await page.locator('#purchase_tax_rate').fill('5');
    await page.locator('#sale_tax_rate').fill('10');
    await page.getByRole('button', { name: /lưu cấu hình/i }).click();

    await page.goto('/backend/product/create');
    await expect(page.locator('#apply_tax')).toHaveCount(0);
    await expect(page.locator('input[name="apply_tax"]')).toHaveValue('1');
  });
  test('SEO block persists and loads on edit', async ({ page }) => {
    const name = await createBaseProduct(page, 'SEO');
    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);
    await expect(page.locator('[data-testid="seo-toggle"]')).toBeVisible();
    await page.locator('[data-testid="seo-toggle"]').click();
    await expect(page.locator('[data-testid="product-canonical"]')).toHaveValue(/e2e-ui-seo-/);
  });

  test('Pricing block persists and loads on edit', async ({ page }) => {
    const name = await createBaseProduct(page, 'PRICE');
    await page.locator('input#retail_price').fill('123000');
    await page.locator('[data-testid="pricing-has-wholesale"]').click();
    await page.locator('input#wholesale_price').fill('99000');
    await page.locator('[data-testid="pricing-add-tier"]').click();
    await page.locator('input[name="pricing_tiers[0][min_quantity]"]').first().fill('2');
    await page.locator('input[name="pricing_tiers[0][max_quantity]"]').first().fill('10');
    await page.locator('input[name="pricing_tiers[0][price]"]').first().fill('95000');

    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);

    await expect(page.locator('input#retail_price')).toHaveValue(/123/);
    await expect(page.locator('input#wholesale_price')).toHaveValue(/99/);
    await expect(page.locator('input[name="pricing_tiers[0][min_quantity]"]').first()).toHaveValue(/2/);
    await expect(page.locator('input[name="pricing_tiers[0][max_quantity]"]').first()).toHaveValue(/10/);
  });

  test('Tags block persists and loads on edit', async ({ page }) => {
    const name = await createBaseProduct(page, 'TAGS');
    await page.locator('[data-testid="tags-input"]').fill('Tag UI A');
    await page.locator('[data-testid="tags-input"]').press('Enter');
    await page.locator('[data-testid="tags-input"]').fill('Tag UI B');
    await page.locator('[data-testid="tags-input"]').press('Enter');

    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);
    await expect(page.getByText('Tag UI A')).toBeVisible();
    await expect(page.getByText('Tag UI B')).toBeVisible();
  });

  test('Variants block persists and loads on edit', async ({ page }) => {
    test.setTimeout(120_000);
    const name = await createBaseProduct(page, 'VAR');

    const addAttributeButton = page
      .locator('[data-testid="attributes-add"]')
      .or(page.locator('[data-testid="attributes-add-more"]'));
    await addAttributeButton.first().click({ force: true });
    const attrName0 = page.locator('[data-testid^="attribute-name-"]').first();
    await expect(attrName0).toBeVisible({ timeout: 15_000 });
    await attrName0.fill('Màu');
    await page.locator('[data-testid="attribute-values-0"]').fill('Đỏ');
    await page.locator('[data-testid="attribute-values-0"]').press('Enter');
    await page.locator('[data-testid="attribute-values-0"]').fill('Xanh');
    await page.locator('[data-testid="attribute-values-0"]').press('Enter');

    await expect(page.locator('[data-testid^="variant-edit-"]')).toHaveCount(2, { timeout: 15_000 });
    await page.locator('[data-testid="variant-edit-0"]').click();
    const sku = `SKU-UI-${nowId()}-${Math.floor(Math.random() * 10000)}`;
    await page.locator('[data-testid="variant-sku"]').fill(sku);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    // Re-open to ensure UI state kept the SKU before saving
    await page.locator('[data-testid="variant-edit-0"]').click();
    await expect(page.locator('[data-testid="variant-sku"]')).toHaveValue(sku);
    await page.getByRole('button', { name: 'Hủy' }).click();

    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);

    await page.locator('[data-testid="variants-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid^="variant-edit-"]')).toHaveCount(2, { timeout: 15_000 });
    // Find the variant that has our SKU (order can change)
    let found = false;
    for (let i = 0; i < 2; i++) {
      await page.locator(`[data-testid="variant-edit-${i}"]`).click();
      const current = await page.locator('[data-testid="variant-sku"]').inputValue();
      if (current === sku) {
        found = true;
        await page.getByRole('button', { name: 'Hủy' }).click();
        break;
      }
      await page.getByRole('button', { name: 'Hủy' }).click();
    }
    expect(found).toBeTruthy();
  });

  test('Edit product: adding a new attribute does not wipe loaded variants', async ({ page }) => {
    test.setTimeout(150_000);

    // Create with 1 attribute (2 values) => 2 variants
    const name = await createBaseProduct(page, 'EDIT+ATTR');
    const addAttributeButton = page
      .locator('[data-testid="attributes-add"]')
      .or(page.locator('[data-testid="attributes-add-more"]'));
    await addAttributeButton.first().click({ force: true });
    await page.locator('[data-testid="attribute-name-0"]').fill('Màu');
    await page.locator('[data-testid="attribute-values-0"]').fill('Đỏ');
    await page.locator('[data-testid="attribute-values-0"]').press('Enter');
    await page.locator('[data-testid="attribute-values-0"]').fill('Xanh');
    await page.locator('[data-testid="attribute-values-0"]').press('Enter');

    await expect(page.locator('[data-testid^="variant-edit-"]')).toHaveCount(2, { timeout: 15_000 });
    const sku0 = `SKU-KEEP-0-${nowId()}-${Math.floor(Math.random() * 10000)}`;
    const sku1 = `SKU-KEEP-1-${nowId()}-${Math.floor(Math.random() * 10000)}`;
    await page.locator('[data-testid="variant-edit-0"]').click();
    await page.locator('[data-testid="variant-sku"]').fill(sku0);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page.locator('[data-testid="variant-edit-1"]').click();
    await page.locator('[data-testid="variant-sku"]').fill(sku1);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);

    // Add a new attribute (2 values) => 4 combinations; old variants must not disappear
    await page.locator('[data-testid="attributes-add-more"]').click({ force: true });
    await page.locator('[data-testid="attribute-name-1"]').fill('Size');
    await page.locator('[data-testid="attribute-values-1"]').fill('S');
    await page.locator('[data-testid="attribute-values-1"]').press('Enter');
    await page.locator('[data-testid="attribute-values-1"]').fill('M');
    await page.locator('[data-testid="attribute-values-1"]').press('Enter');

    await page.locator('[data-testid="variants-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid^="variant-edit-"]')).toHaveCount(4, { timeout: 20_000 });

    // Verify our two SKUs are still present on some variants (not wiped)
    let seen0 = false;
    let seen1 = false;
    for (let i = 0; i < 4; i++) {
      await page.locator(`[data-testid="variant-edit-${i}"]`).click();
      const vSku = await page.locator('[data-testid="variant-sku"]').inputValue();
      if (vSku === sku0) seen0 = true;
      if (vSku === sku1) seen1 = true;
      await page.getByRole('button', { name: 'Hủy' }).click();
    }
    expect(seen0).toBeTruthy();
    expect(seen1).toBeTruthy();
  });

  test('Inventory checkboxes persist and load on edit', async ({ page }) => {
    const name = await createBaseProduct(page, 'INV');

    // Turn OFF track inventory
    await page.locator('[data-testid="inventory-track"]').click();
    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);
    await expect(page.locator('[data-testid="inventory-track"]')).not.toBeChecked();

    // Turn ON track inventory + allow negative stock
    await page.locator('[data-testid="inventory-track"]').click();
    await expect(page.locator('[data-testid="inventory-track"]')).toBeChecked();
    await page.locator('[data-testid="inventory-allow-negative"]').click();
    await saveAndGoIndex(page);
    await searchAndOpenEdit(page, name);
    await expect(page.locator('[data-testid="inventory-track"]')).toBeChecked();
    await expect(page.locator('[data-testid="inventory-allow-negative"]')).toBeChecked();
  });
});

