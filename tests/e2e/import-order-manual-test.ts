/**
 * Manual Test Script for Import Order Pipeline
 * Chạy script này để mở browser và test thủ công
 * 
 * Usage: npx playwright codegen http://127.0.0.1:8000
 * Hoặc: node tests/e2e/import-order-manual-test.ts
 */

import { chromium } from 'playwright';

async function runManualTest() {
    console.log('🚀 Starting Import Order Pipeline Manual Test...\n');
    
    const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8000';
    const email = process.env.E2E_EMAIL || 'admin@example.com';
    const password = process.env.E2E_PASSWORD || 'password';
    
    console.log(`📍 Base URL: ${baseURL}`);
    console.log(`👤 Email: ${email}\n`);
    
    // Launch browser
    const browser = await chromium.launch({ 
        headless: false, // Show browser
        slowMo: 500 // Slow down for visibility
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Step 1: Login
        console.log('📝 Step 1: Logging in...');
        await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
        
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"], [data-test="login-button"]');
        
        // Wait for redirect
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
        console.log('✅ Login successful\n');
        
        // Step 2: Navigate to Import Order
        console.log('📝 Step 2: Navigating to Import Order page...');
        await page.goto(`${baseURL}/backend/import-order`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        console.log('✅ Navigated to Import Order index\n');
        
        // Step 3: Check for errors in console
        console.log('📝 Step 3: Checking for console errors...');
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
                console.error('❌ Console Error:', msg.text());
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
            console.error('❌ Page Error:', error.message);
        });
        
        await page.waitForTimeout(3000);
        
        if (errors.length === 0) {
            console.log('✅ No console errors detected\n');
        } else {
            console.log(`⚠️ Found ${errors.length} errors\n`);
        }
        
        // Step 4: Try to create new order
        console.log('📝 Step 4: Testing Create Order...');
        const createButton = page.locator('a[href*="/backend/import-order/create"], button:has-text("Thêm mới")').first();
        
        if (await createButton.isVisible({ timeout: 5000 })) {
            await createButton.click();
            await page.waitForURL((url) => url.pathname.includes('/create'), { timeout: 10000 });
            await page.waitForTimeout(2000);
            console.log('✅ Create page loaded\n');
            
            // Check for form fields
            const supplierField = page.locator('input[name="supplier_id"], select[name="supplier_id"]').first();
            if (await supplierField.isVisible({ timeout: 2000 })) {
                console.log('✅ Form fields are visible\n');
            }
        } else {
            console.log('⚠️ Create button not found\n');
        }
        
        // Step 5: Check existing orders
        console.log('📝 Step 5: Checking existing orders...');
        await page.goto(`${baseURL}/backend/import-order`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const table = page.locator('table').first();
        if (await table.isVisible({ timeout: 5000 })) {
            const rows = table.locator('tbody tr');
            const rowCount = await rows.count();
            console.log(`✅ Found ${rowCount} orders in table\n`);
            
            if (rowCount > 0) {
                // Click on first order
                console.log('📝 Step 6: Opening first order...');
                await rows.first().click();
                await page.waitForURL((url) => /\/backend\/import-order\/\d+/.test(url.pathname), { timeout: 10000 });
                await page.waitForTimeout(2000);
                console.log('✅ Order details page loaded\n');
                
                // Check for action buttons
                const importButton = page.locator('button:has-text("Nhập kho"), button:has-text("Import to Stock")').first();
                const cancelButton = page.locator('button:has-text("Hủy"), button:has-text("Cancel")').first();
                
                if (await importButton.isVisible({ timeout: 2000 })) {
                    console.log('✅ Import to Stock button found');
                }
                if (await cancelButton.isVisible({ timeout: 2000 })) {
                    console.log('✅ Cancel button found');
                }
            }
        } else {
            console.log('⚠️ Table not found\n');
        }
        
        console.log('\n✅ Manual test completed!');
        console.log('👀 Browser will stay open for 30 seconds for manual inspection...');
        console.log('💡 You can now manually test the Import Order functionality\n');
        
        // Keep browser open for 30 seconds
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run if executed directly
if (require.main === module) {
    runManualTest().catch(console.error);
}

export default runManualTest;
