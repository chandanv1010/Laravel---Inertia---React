import { expect, test as setup } from '@playwright/test';

const email = process.env.E2E_EMAIL || '';
const password = process.env.E2E_PASSWORD || '';

setup('login', async ({ page }) => {
  if (!email || !password) {
    throw new Error('Missing E2E_EMAIL / E2E_PASSWORD environment variables');
  }

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('[data-test="login-button"]').click();

  // Should land on an authenticated page (dashboard or backend area)
  await expect(page).not.toHaveURL(/\/login$/);
});

