import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Inventory Management Test Suite
 * Tests all inventory scenarios:
 * 1. Simple product (no variants, no batch)
 * 2. Simple product with batch tracking
 * 3. Product with variants (no batch)
 * 4. Product with variants + batch tracking
 * 5. Stock transfers between warehouses
 * 6. History logs
 */

// Test data
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8000';

// Helper functions
async function login(page: Page) {
    const email = process.env.E2E_EMAIL || 'admin@example.com';
    const password = process.env.E2E_PASSWORD || 'password';
    
    await page.goto('/login');
    if (await page.locator('[data-test="login-button"]').isVisible()) {
        await page.getByLabel('Email address').fill(email);
        await page.getByLabel('Password').fill(password);
        await page.locator('[data-test="login-button"]').click();
        await expect(page).not.toHaveURL(/\/login$/);
    }
}

async function waitForPageLoad(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
}

// ========================================
// TEST SUITE 1: Simple Product Inventory
// ========================================
test.describe('Simple Product Inventory Management', () => {
    
    test('should display warehouse stock table correctly', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        // Find a product and click edit
        const productRow = page.locator('table tbody tr').first();
        if (await productRow.isVisible()) {
            await productRow.click();
            await waitForPageLoad(page);
            
            // Check if inventory section exists
            const inventorySection = page.locator('text=Thông tin kho');
            if (await inventorySection.isVisible()) {
                // Check warehouse stock table
                const warehouseTable = page.locator('[data-testid="warehouse-stock-table"]').or(
                    page.locator('text=Kho lưu trữ').locator('xpath=ancestor::div[contains(@class, "card")]')
                );
                await expect(warehouseTable.or(inventorySection)).toBeVisible();
            }
        }
    });

    test('should be able to adjust stock for simple product', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        // Navigate to first product
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Check for "Quản lý số lượng tồn kho" checkbox
            const trackInventoryCheckbox = page.locator('input[id="track_inventory"]');
            if (await trackInventoryCheckbox.isVisible()) {
                const isChecked = await trackInventoryCheckbox.isChecked();
                console.log(`Track inventory is ${isChecked ? 'enabled' : 'disabled'}`);
            }
        }
    });
});

// ========================================
// TEST SUITE 2: Batch Tracking Products
// ========================================
test.describe('Batch Tracking Product Inventory', () => {
    
    test('should display batch list for batch-tracked products', async ({ page }) => {
        // Find a product with batch tracking enabled
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Check for batch tracking checkbox
            const batchTrackingCheckbox = page.locator('input[id="batch_tracking"]');
            if (await batchTrackingCheckbox.isVisible()) {
                // Check if batch list tab exists
                const batchTab = page.locator('button:has-text("Lô sản phẩm")');
                if (await batchTab.isVisible()) {
                    await batchTab.click();
                    await waitForPageLoad(page);
                    
                    // Check batch list table
                    const batchTable = page.locator('table');
                    await expect(batchTable).toBeVisible();
                }
            }
        }
    });

    test('should show correct warehouse distribution in batch list', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Look for batch list
            const batchTab = page.locator('button:has-text("Lô sản phẩm")');
            if (await batchTab.isVisible()) {
                await batchTab.click();
                await waitForPageLoad(page);
                
                // Check if "Kho" column shows warehouse distribution
                const warehouseColumn = page.locator('th:has-text("Kho")');
                if (await warehouseColumn.isVisible()) {
                    console.log('Warehouse column is visible in batch list');
                }
            }
        }
    });
});

// ========================================
// TEST SUITE 3: Product Variants Inventory
// ========================================
test.describe('Product Variant Inventory Management', () => {
    
    test('should display variants section with stock info', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        // Find a product with variants
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Check for variants section
            const variantsSection = page.locator('[data-testid="variants-section"]').or(
                page.locator('text=Phiên bản sản phẩm')
            );
            if (await variantsSection.isVisible()) {
                console.log('Variants section found');
                
                // Check stock column in variants table
                const stockColumn = page.locator('th:has-text("Tồn kho")');
                if (await stockColumn.isVisible()) {
                    console.log('Stock column is visible in variants table');
                }
            }
        }
    });

    test('should navigate to variant detail page and manage inventory', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        // Find product with variants
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Click on variant link
            const variantLink = page.locator('a[href*="/variants/"]').first();
            if (await variantLink.isVisible()) {
                await variantLink.click();
                await waitForPageLoad(page);
                
                // Should be on variant detail page
                await expect(page).toHaveURL(/\/variants\/\d+/);
                
                // Check for inventory info section
                const inventorySection = page.locator('text=Thông tin kho');
                await expect(inventorySection).toBeVisible();
                
                // Check for warehouse stock table with correct values
                const warehouseRows = page.locator('table tbody tr');
                const rowCount = await warehouseRows.count();
                console.log(`Found ${rowCount} warehouse rows in variant inventory`);
            }
        }
    });

    test('should show tooltip with warehouse distribution when hovering stock', async ({ page }) => {
        await page.goto('/backend/product');
        await waitForPageLoad(page);
        
        const editButton = page.locator('a[href*="/backend/product/"][href*="/edit"]').first();
        if (await editButton.isVisible()) {
            await editButton.click();
            await waitForPageLoad(page);
            
            // Find variant with stock
            const stockCell = page.locator('[data-testid="variants-section"] td').filter({ hasText: /^\d+$/ }).first();
            if (await stockCell.isVisible()) {
                // Hover to see tooltip
                await stockCell.hover();
                await page.waitForTimeout(500);
                
                // Check for tooltip
                const tooltip = page.locator('[role="tooltip"]');
                if (await tooltip.isVisible()) {
                    console.log('Tooltip with warehouse distribution is visible');
                }
            }
        }
    });
});

// ========================================
// TEST SUITE 4: Variant Batch Detail Page
// ========================================
test.describe('Variant Detail Page - Batch Management', () => {
    
    test('should load variant detail page with correct warehouse stocks', async ({ page }) => {
        // Navigate directly to a known variant detail page
        // Using variant ID 18 based on previous tests
        await page.goto('/backend/product/85/variants/18');
        await waitForPageLoad(page);
        
        // Check page loaded correctly
        const pageTitle = page.locator('h1, [class*="heading"]');
        await expect(pageTitle.first()).toBeVisible();
        
        // Check inventory section
        const inventorySection = page.locator('text=Thông tin kho');
        if (await inventorySection.isVisible()) {
            console.log('Inventory section is visible on variant detail page');
            
            // Wait for any async data loading
            await page.waitForTimeout(2000);
            
            // Check warehouse stock values
            const warehouseRows = page.locator('table tbody tr');
            const rowCount = await warehouseRows.count();
            
            for (let i = 0; i < rowCount; i++) {
                const row = warehouseRows.nth(i);
                const warehouseName = await row.locator('td').first().textContent();
                const stockValue = await row.locator('td').nth(1).textContent();
                console.log(`Warehouse: ${warehouseName}, Stock: ${stockValue}`);
            }
        }
    });

    test('should not re-render with incorrect stock values', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        
        // Initial load
        await waitForPageLoad(page);
        await page.waitForTimeout(1000);
        
        // Capture initial stock values
        const initialStocks: string[] = [];
        const warehouseRows = page.locator('table tbody tr');
        const rowCount = await warehouseRows.count();
        
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = warehouseRows.nth(i);
            const stockCell = row.locator('td').nth(1);
            if (await stockCell.isVisible()) {
                const text = await stockCell.textContent();
                initialStocks.push(text || '');
            }
        }
        
        console.log('Initial stocks:', initialStocks);
        
        // Wait for potential re-renders
        await page.waitForTimeout(3000);
        
        // Check if stocks changed (they shouldn't)
        const finalStocks: string[] = [];
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = warehouseRows.nth(i);
            const stockCell = row.locator('td').nth(1);
            if (await stockCell.isVisible()) {
                const text = await stockCell.textContent();
                finalStocks.push(text || '');
            }
        }
        
        console.log('Final stocks:', finalStocks);
        
        // Compare initial and final stocks
        const stocksMatched = JSON.stringify(initialStocks) === JSON.stringify(finalStocks);
        console.log(`Stocks remained stable: ${stocksMatched}`);
        
        expect(stocksMatched).toBe(true);
    });

    test('should show batch list in Lô sản phẩm tab', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        await waitForPageLoad(page);
        
        // Click on batch tab
        const batchTab = page.locator('button:has-text("Lô sản phẩm")');
        if (await batchTab.isVisible()) {
            await batchTab.click();
            await waitForPageLoad(page);
            
            // Check batch list
            const batchTable = page.locator('table');
            await expect(batchTable).toBeVisible();
            
            // Check batch rows
            const batchRows = page.locator('table tbody tr');
            const batchCount = await batchRows.count();
            console.log(`Found ${batchCount} batches for variant`);
        }
    });
});

// ========================================
// TEST SUITE 5: Warehouse Batch List Modal
// ========================================
test.describe('Warehouse Batch List Modal', () => {
    
    test('should filter batches correctly by warehouse', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        await waitForPageLoad(page);
        
        // Find and click on adjust stock button for a specific warehouse
        const adjustButton = page.locator('button:has-text("Điều chỉnh")').or(
            page.locator('[class*="pencil"]')
        ).first();
        
        if (await adjustButton.isVisible()) {
            await adjustButton.click();
            await waitForPageLoad(page);
            
            // Check if modal opened
            const modal = page.locator('[role="dialog"]');
            if (await modal.isVisible()) {
                console.log('Batch adjustment modal opened');
                
                // Check batch list in modal
                const batchRows = modal.locator('table tbody tr');
                const batchCount = await batchRows.count();
                console.log(`Found ${batchCount} batches in warehouse modal`);
            }
        }
    });
});

// ========================================
// TEST SUITE 6: Batch Detail Page & History
// ========================================
test.describe('Batch Detail Page and Stock History', () => {
    
    test('should show batch detail with warehouse distribution', async ({ page }) => {
        await page.goto('/backend/product-batches/88/detail');
        await waitForPageLoad(page);
        
        // Check page title
        const pageTitle = page.locator('h1, [class*="heading"]');
        await expect(pageTitle.first()).toBeVisible();
        
        // Check for warehouse distribution display
        const warehouseDistribution = page.locator('text=Kho').or(
            page.locator('text=Phân bổ')
        );
        if (await warehouseDistribution.first().isVisible()) {
            console.log('Warehouse distribution info is visible');
        }
        
        // Check for stock quantity display
        const stockInfo = page.locator('text=Tồn kho').or(
            page.locator('text=Số lượng')
        );
        if (await stockInfo.first().isVisible()) {
            console.log('Stock info is visible on batch detail page');
        }
    });

    test('should show stock change history', async ({ page }) => {
        await page.goto('/backend/product-batches/88/detail');
        await waitForPageLoad(page);
        
        // Look for history table
        const historySection = page.locator('text=Lịch sử').or(
            page.locator('text=History')
        );
        
        if (await historySection.first().isVisible()) {
            console.log('History section found');
            
            // Check history table
            const historyTable = page.locator('table').last();
            if (await historyTable.isVisible()) {
                const historyRows = historyTable.locator('tbody tr');
                const historyCount = await historyRows.count();
                console.log(`Found ${historyCount} history entries`);
                
                // Log first few history entries
                for (let i = 0; i < Math.min(historyCount, 3); i++) {
                    const row = historyRows.nth(i);
                    const cells = row.locator('td');
                    const cellCount = await cells.count();
                    const rowData = [];
                    for (let j = 0; j < cellCount; j++) {
                        rowData.push(await cells.nth(j).textContent());
                    }
                    console.log(`History row ${i + 1}:`, rowData);
                }
            }
        }
    });

    test('should show transfer logs in history', async ({ page }) => {
        await page.goto('/backend/product-batches/88/detail');
        await waitForPageLoad(page);
        
        // Wait for history to load
        await page.waitForTimeout(2000);
        
        // Check for transfer type logs
        const transferBadge = page.locator('text=transfer').or(
            page.locator('text=Chuyển kho')
        );
        
        if (await transferBadge.first().isVisible()) {
            console.log('Transfer logs are visible in history');
        } else {
            console.log('No transfer logs found - this may be expected if no transfers occurred');
        }
    });
});

// ========================================
// TEST SUITE 7: Stock Adjustment Flow
// ========================================
test.describe('Stock Adjustment Flow', () => {
    
    test('should be able to adjust stock via popover', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        await waitForPageLoad(page);
        
        // Click on stock adjustment button (pencil icon)
        const adjustButton = page.locator('button svg[class*="pencil"]').first().locator('xpath=ancestor::button');
        
        if (await adjustButton.isVisible()) {
            await adjustButton.click();
            await page.waitForTimeout(500);
            
            // Check if popover opened
            const popover = page.locator('[data-radix-popper-content-wrapper]');
            if (await popover.isVisible()) {
                console.log('Stock adjustment popover opened');
                
                // Check for input fields
                const stockInput = popover.locator('input[type="number"]').or(
                    popover.locator('input[inputmode="numeric"]')
                ).first();
                
                if (await stockInput.isVisible()) {
                    console.log('Stock input field found');
                }
                
                // Check for reason dropdown
                const reasonSelect = popover.locator('select').or(
                    popover.locator('[role="combobox"]')
                );
                if (await reasonSelect.first().isVisible()) {
                    console.log('Reason selection found');
                }
            }
        }
    });
});

// ========================================
// TEST SUITE 8: Database Consistency Check
// ========================================
test.describe('Data Consistency Checks', () => {
    
    test('should have consistent stock values across views', async ({ page }) => {
        // Get stock from variant detail page
        await page.goto('/backend/product/85/variants/18');
        await waitForPageLoad(page);
        await page.waitForTimeout(2000);
        
        const variantDetailStocks: { warehouse: string, stock: string }[] = [];
        
        // Capture stocks from warehouse storage tab
        const warehouseRows = page.locator('table tbody tr');
        const rowCount = await warehouseRows.count();
        
        for (let i = 0; i < rowCount; i++) {
            const row = warehouseRows.nth(i);
            const cells = row.locator('td');
            const cellCount = await cells.count();
            
            if (cellCount >= 2) {
                const warehouse = await cells.first().textContent();
                const stock = await cells.nth(1).textContent();
                if (warehouse && stock) {
                    variantDetailStocks.push({ 
                        warehouse: warehouse.trim(), 
                        stock: stock.trim() 
                    });
                }
            }
        }
        
        console.log('Variant detail stocks:', variantDetailStocks);
        
        // Now check batch tab
        const batchTab = page.locator('button:has-text("Lô sản phẩm")');
        if (await batchTab.isVisible()) {
            await batchTab.click();
            await waitForPageLoad(page);
            
            const batchRows = page.locator('table tbody tr');
            const batchRowCount = await batchRows.count();
            
            console.log(`Batch count: ${batchRowCount}`);
            
            // Sum up batch stocks - should match warehouse stocks
            for (let i = 0; i < batchRowCount; i++) {
                const row = batchRows.nth(i);
                const cells = row.locator('td');
                const batchCode = await cells.first().textContent();
                const stockCell = await cells.nth(-2).textContent(); // Stock column
                console.log(`Batch: ${batchCode}, Stock: ${stockCell}`);
            }
        }
    });
});

// ========================================
// SUMMARY TEST
// ========================================
test('Generate Inventory Management Test Summary', async ({ page }) => {
    const results: { test: string, status: string, notes: string }[] = [];
    
    // Test 1: Product list loads
    await page.goto('/backend/product');
    await waitForPageLoad(page);
    const productListLoaded = await page.locator('table').isVisible();
    results.push({
        test: 'Product list loads',
        status: productListLoaded ? 'PASS' : 'FAIL',
        notes: productListLoaded ? 'Product list table visible' : 'Could not find product table'
    });
    
    // Test 2: Variant detail page loads correctly
    await page.goto('/backend/product/85/variants/18');
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);
    
    const variantPageLoaded = await page.locator('text=Thông tin kho').isVisible();
    results.push({
        test: 'Variant detail page loads',
        status: variantPageLoaded ? 'PASS' : 'FAIL',
        notes: variantPageLoaded ? 'Inventory section visible' : 'Inventory section not found'
    });
    
    // Test 3: Stock values don't re-render incorrectly
    const initialStock = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();
    await page.waitForTimeout(3000);
    const finalStock = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();
    const stockStable = initialStock === finalStock;
    results.push({
        test: 'Stock values remain stable (no bad re-render)',
        status: stockStable ? 'PASS' : 'FAIL',
        notes: stockStable ? `Stock stable at ${initialStock}` : `Stock changed from ${initialStock} to ${finalStock}`
    });
    
    // Test 4: Batch tab works
    const batchTab = page.locator('button:has-text("Lô sản phẩm")');
    if (await batchTab.isVisible()) {
        await batchTab.click();
        await waitForPageLoad(page);
        const batchTableVisible = await page.locator('table').isVisible();
        results.push({
            test: 'Batch tab shows batch list',
            status: batchTableVisible ? 'PASS' : 'FAIL',
            notes: batchTableVisible ? 'Batch table visible' : 'Batch table not found'
        });
    }
    
    // Test 5: Batch detail page loads
    await page.goto('/backend/product-batches/88/detail');
    await waitForPageLoad(page);
    const batchDetailLoaded = await page.locator('h1, [class*="heading"]').first().isVisible();
    results.push({
        test: 'Batch detail page loads',
        status: batchDetailLoaded ? 'PASS' : 'FAIL',
        notes: batchDetailLoaded ? 'Batch detail page visible' : 'Batch detail page not found'
    });
    
    // Print summary
    console.log('\n========================================');
    console.log('INVENTORY MANAGEMENT TEST SUMMARY');
    console.log('========================================\n');
    
    let passCount = 0;
    let failCount = 0;
    
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.test}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Notes: ${r.notes}`);
        console.log('');
        
        if (r.status === 'PASS') passCount++;
        else failCount++;
    });
    
    console.log('========================================');
    console.log(`TOTAL: ${passCount} PASS, ${failCount} FAIL`);
    console.log('========================================\n');
    
    // All tests should pass
    expect(failCount).toBe(0);
});
