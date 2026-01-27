import { test, expect } from '@playwright/test';

/**
 * Simple UI Check for Inventory Management
 * Runs without auth setup - just checks pages load correctly
 */

test.describe('Inventory UI Quick Check', () => {
    
    // Skip global auth setup for this test
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Login page loads', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveURL(/login/);
        console.log('✅ Login page loads correctly');
    });

    test('Check product page requires auth', async ({ page }) => {
        const response = await page.goto('/backend/product');
        // Should redirect to login
        await expect(page).toHaveURL(/login/);
        console.log('✅ Product page correctly requires authentication');
    });
});
