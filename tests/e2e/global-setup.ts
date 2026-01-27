import fs from 'node:fs';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8000';
  const email = process.env.E2E_EMAIL || '';
  const password = process.env.E2E_PASSWORD || '';

  if (!email || !password) {
    throw new Error('Missing E2E_EMAIL / E2E_PASSWORD environment variables');
  }

  const storageStatePath = path.resolve('playwright/.auth/user.json');
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
  // If we already have a storage state, validate it before reusing.
  if (fs.existsSync(storageStatePath) && fs.statSync(storageStatePath).size > 0) {
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage({ storageState: storageStatePath });
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
      // If session expired, app redirects to login.
      const isLogin = page.url().includes('/login');
      await browser.close();
      if (!isLogin) return;
    } catch {
      // fall through to re-login
    }
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('[data-test="login-button"], button[type="submit"]').first().click();

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

