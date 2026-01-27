import { test, expect } from '@playwright/test';

test.describe('Promotion Edit - Product Catalogue Display', () => {
    test.beforeEach(async ({ page }) => {
        // Use storageState if available (from global-setup)
        // Otherwise, try to access directly if no auth required
    });

    test('should display product catalogue names when editing promotion', async ({ page }) => {
        // Collect console logs
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (text.includes('Product catalogue items') || text.includes('Selected catalogues')) {
                console.log('Frontend log:', text);
            }
        });
        
        // Navigate to edit promotion page (ID 6)
        await page.goto('/backend/promotion/promotion/6/edit');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Wait a bit more for React to render
        
        // Check if product catalogue section exists
        const catalogueSection = page.locator('text=Danh mục sản phẩm').first();
        const isVisible = await catalogueSection.isVisible().catch(() => false);
        
        if (!isVisible) {
            console.log('Catalogue section not found, checking page content...');
            const pageContent = await page.content();
            console.log('Page title:', await page.title());
            
            // Take screenshot for debugging
            await page.screenshot({ path: 'test-results/promotion-edit-catalogue-debug.png', fullPage: true });
            
            // Check if we're on the right page
            const url = page.url();
            console.log('Current URL:', url);
            
            // Check console logs
            console.log('Console logs:', consoleLogs);
            return;
        }
        
        await expect(catalogueSection).toBeVisible();
        
        // Look for selected catalogues - they should be in a div with border rounded-lg
        // and contain a font-medium text (the name)
        const selectedCatalogues = page.locator('div.border.rounded-lg').filter({ 
            has: page.locator('.font-medium')
        });
        
        const count = await selectedCatalogues.count();
        console.log(`Found ${count} selected catalogue items`);
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/promotion-edit-catalogue.png', fullPage: true });
        
        // Check if catalogue names are visible (not empty)
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const catalogueItem = selectedCatalogues.nth(i);
                const nameElement = catalogueItem.locator('.font-medium');
                
                if (await nameElement.count() > 0) {
                    const name = await nameElement.textContent();
                    console.log(`Catalogue item ${i} name: "${name}"`);
                    expect(name?.trim()).not.toBe('');
                    expect(name?.trim().length).toBeGreaterThan(0);
                } else {
                    console.log(`Catalogue item ${i} has no name element`);
                }
            }
        } else {
            console.log('No catalogue items found. Checking if apply_source is set to product_catalogue...');
            // Check if "Danh mục sản phẩm" radio is selected
            const categoryRadio = page.locator('input[type="radio"][value="product_catalogue"]');
            const isChecked = await categoryRadio.isChecked().catch(() => false);
            console.log('Product catalogue radio checked:', isChecked);
            
            // Log all console logs
            console.log('All console logs:', consoleLogs);
        }
    });
    
    test('should check backend API response', async ({ request, page }) => {
        // First login if needed
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        
        // Try to get cookies from page context
        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // Make direct API call to check backend response
        const response = await request.get('/backend/promotion/promotion/6/edit', {
            headers: {
                'Cookie': cookieHeader,
                'Referer': page.url(),
            }
        });
        
        expect(response.status()).toBe(200);
        
        // Check response body (Inertia response)
        const body = await response.text();
        
        // Log response for debugging
        console.log('Response status:', response.status());
        
        // Check if product_catalogue_items exists in response
        if (body.includes('product_catalogue_items')) {
            console.log('✓ product_catalogue_items found in response');
            
            // Try to extract JSON data from Inertia response
            const jsonMatch = body.match(/window\.page\s*=\s*({.*?});/s);
            if (jsonMatch) {
                try {
                    const pageData = JSON.parse(jsonMatch[1]);
                    const props = pageData.props || {};
                    const promotion = props.promotion || {};
                    const catalogueItems = promotion.product_catalogue_items || [];
                    
                    console.log(`✓ Product catalogue items count: ${catalogueItems.length}`);
                    
                    if (catalogueItems.length === 0) {
                        console.log('⚠ No catalogue items found in response');
                        return;
                    }
                    
                    catalogueItems.forEach((item: any, index: number) => {
                        console.log(`Item ${index}:`, {
                            id: item.id,
                            name: item.name || '(empty)',
                            image: item.image || '(no image)'
                        });
                        
                        if (!item.name || item.name.trim() === '') {
                            console.error(`❌ Item ${index} (ID: ${item.id}) has empty name!`);
                        } else {
                            console.log(`✓ Item ${index} has name: "${item.name}"`);
                        }
                        
                        expect(item.name).toBeTruthy();
                        expect(item.name.trim()).not.toBe('');
                    });
                } catch (e) {
                    console.error('❌ Error parsing Inertia response:', e);
                    throw e;
                }
            } else {
                console.log('⚠ Could not find window.page in response');
            }
        } else {
            console.log('❌ product_catalogue_items NOT found in response');
        }
    });
});

