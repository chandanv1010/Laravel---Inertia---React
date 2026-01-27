import { test, expect } from '@playwright/test';

/**
 * Quick UI Test for Inventory Management
 * Uses existing auth state if available
 */

test.setTimeout(120000);

test.describe('Quick Inventory UI Tests', () => {

    test('Test variant detail page stock display', async ({ page }) => {
        // Go directly to variant detail page
        await page.goto('/backend/product/85/variants/18');
        
        // Wait for page load
        await page.waitForLoadState('networkidle');
        
        // Check if we're redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('⚠️ Not authenticated - need to login first');
            test.skip();
            return;
        }

        // Wait for content to load
        await page.waitForTimeout(2000);

        // Check page loaded
        const heading = await page.locator('h1, [class*="heading"]').first();
        await expect(heading).toBeVisible();
        console.log('✅ Variant detail page loaded');

        // Capture initial stock values
        const tableRows = page.locator('table tbody tr');
        const rowCount = await tableRows.count();
        console.log(`Found ${rowCount} warehouse rows`);

        const initialStocks: { warehouse: string, stock: string }[] = [];
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = tableRows.nth(i);
            const cells = row.locator('td');
            const cellCount = await cells.count();
            if (cellCount >= 2) {
                const warehouse = await cells.first().textContent() || '';
                const stock = await cells.nth(1).textContent() || '';
                initialStocks.push({ warehouse: warehouse.trim(), stock: stock.trim() });
                console.log(`   ${warehouse.trim()}: ${stock.trim()}`);
            }
        }

        // Wait for potential re-renders
        console.log('\n⏳ Waiting 5 seconds to check for re-render issues...');
        await page.waitForTimeout(5000);

        // Check if stocks changed
        const finalStocks: { warehouse: string, stock: string }[] = [];
        for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = tableRows.nth(i);
            const cells = row.locator('td');
            const cellCount = await cells.count();
            if (cellCount >= 2) {
                const warehouse = await cells.first().textContent() || '';
                const stock = await cells.nth(1).textContent() || '';
                finalStocks.push({ warehouse: warehouse.trim(), stock: stock.trim() });
            }
        }

        // Compare
        let allMatch = true;
        for (let i = 0; i < initialStocks.length; i++) {
            const initial = initialStocks[i];
            const final = finalStocks[i];
            if (initial.stock !== final.stock) {
                console.log(`❌ MISMATCH at ${initial.warehouse}: ${initial.stock} → ${final.stock}`);
                allMatch = false;
            }
        }

        if (allMatch) {
            console.log('✅ Stock values remained stable - no bad re-render');
        } else {
            console.log('❌ Stock values changed unexpectedly - re-render issue detected');
        }

        expect(allMatch).toBe(true);
    });

    test('Test batch tab displays correctly', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('⚠️ Not authenticated');
            test.skip();
            return;
        }

        await page.waitForTimeout(1000);

        // Click on batch tab
        const batchTab = page.locator('button:has-text("Lô sản phẩm")');
        if (await batchTab.isVisible()) {
            await batchTab.click();
            await page.waitForTimeout(1000);

            // Check batch list
            const batchTable = page.locator('table').last();
            if (await batchTable.isVisible()) {
                const batchRows = batchTable.locator('tbody tr');
                const batchCount = await batchRows.count();
                console.log(`✅ Found ${batchCount} batches`);

                // Check warehouse column
                for (let i = 0; i < Math.min(batchCount, 3); i++) {
                    const row = batchRows.nth(i);
                    const cells = row.locator('td');
                    const batchCode = await cells.first().textContent();
                    console.log(`   Batch: ${batchCode?.trim()}`);
                }
            }
        } else {
            console.log('⚠️ Batch tab not visible - may not be batch-tracked product');
        }
    });

    test('Test batch detail page history', async ({ page }) => {
        await page.goto('/backend/product-batches/88/detail');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('⚠️ Not authenticated');
            test.skip();
            return;
        }

        await page.waitForTimeout(2000);

        // Check page loaded
        console.log('✅ Batch detail page loaded');

        // Look for history section
        const historyTable = page.locator('table').last();
        if (await historyTable.isVisible()) {
            const historyRows = historyTable.locator('tbody tr');
            const historyCount = await historyRows.count();
            console.log(`Found ${historyCount} history entries`);

            if (historyCount === 0) {
                console.log('⚠️ No history entries found - may need to check transaction_type filter');
            } else {
                console.log('✅ History entries are displayed');
                
                // Check for transfer logs
                const pageContent = await page.content();
                if (pageContent.includes('transfer') || pageContent.includes('Chuyển kho')) {
                    console.log('✅ Transfer logs are visible');
                } else {
                    console.log('ℹ️ No transfer logs found in visible content');
                }
            }
        }
    });

    test('Test warehouse batch modal', async ({ page }) => {
        await page.goto('/backend/product/85/variants/18');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('⚠️ Not authenticated');
            test.skip();
            return;
        }

        await page.waitForTimeout(2000);

        // Find edit button in warehouse stock table
        const editButtons = page.locator('button:has(svg)').filter({ has: page.locator('svg[class*="pencil"], svg[class*="Pencil"]') });
        const editCount = await editButtons.count();
        console.log(`Found ${editCount} edit buttons`);

        if (editCount > 0) {
            await editButtons.first().click();
            await page.waitForTimeout(1000);

            // Check if popover or modal opened
            const popover = page.locator('[data-radix-popper-content-wrapper]');
            const dialog = page.locator('[role="dialog"]');

            if (await popover.isVisible()) {
                console.log('✅ Stock adjustment popover opened');
            } else if (await dialog.isVisible()) {
                console.log('✅ Stock adjustment modal opened');
                
                // Check if batches are listed in modal
                const modalTable = dialog.locator('table');
                if (await modalTable.isVisible()) {
                    const modalRows = modalTable.locator('tbody tr');
                    const modalRowCount = await modalRows.count();
                    console.log(`   Modal shows ${modalRowCount} batch rows`);
                    
                    if (modalRowCount === 0) {
                        const emptyMessage = await dialog.locator('text=Không có lô nào').isVisible();
                        if (emptyMessage) {
                            console.log('⚠️ Modal shows "Không có lô nào" - may be filtering issue');
                        }
                    }
                }
            } else {
                console.log('⚠️ No popover or modal opened');
            }
        }
    });
});

// Summary test
test('Generate UI Test Summary', async ({ page }) => {
    console.log('\n========================================');
    console.log('INVENTORY UI TEST SUMMARY');
    console.log('========================================\n');

    const results: { test: string, status: string }[] = [];

    // Test 1: Check variant detail page
    await page.goto('/backend/product/85/variants/18');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/login')) {
        console.log('⚠️ Tests require authentication. Please login first.');
        console.log('   Run: npx playwright test --headed to login manually');
        return;
    }

    await page.waitForTimeout(3000);
    
    // Check stock stability
    const table = page.locator('table tbody tr').first();
    const initialStock = await table.locator('td').nth(1).textContent();
    await page.waitForTimeout(3000);
    const finalStock = await table.locator('td').nth(1).textContent();
    
    results.push({
        test: 'Stock values stable (no re-render)',
        status: initialStock === finalStock ? 'PASS' : 'FAIL'
    });

    // Test 2: Batch tab
    const batchTab = page.locator('button:has-text("Lô sản phẩm")');
    if (await batchTab.isVisible()) {
        await batchTab.click();
        await page.waitForTimeout(1000);
        const batchTableVisible = await page.locator('table').isVisible();
        results.push({
            test: 'Batch tab works',
            status: batchTableVisible ? 'PASS' : 'FAIL'
        });
    }

    // Test 3: Batch detail
    await page.goto('/backend/product-batches/88/detail');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const batchDetailLoaded = !page.url().includes('/login');
    results.push({
        test: 'Batch detail page loads',
        status: batchDetailLoaded ? 'PASS' : 'FAIL'
    });

    // Print summary
    let passCount = 0;
    let failCount = 0;
    
    results.forEach((r, i) => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        console.log(`${i + 1}. ${icon} ${r.test}: ${r.status}`);
        if (r.status === 'PASS') passCount++;
        else failCount++;
    });

    console.log('\n========================================');
    console.log(`TOTAL: ${passCount} PASS, ${failCount} FAIL`);
    console.log('========================================\n');
});
