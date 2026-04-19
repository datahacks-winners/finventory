import { test, expect } from '@playwright/test';

const BASE_URL = process.env.WEB_URL || 'http://localhost:5173';

test.describe('Smoke Tests', () => {
  
  test('homepage loads', async ({ page }) => {
    await page.goto(BASE_URL, { timeout: 10000 });
    
    // Verify the page loaded
    const title = await page.title();
    console.log('Page title:', title);
    
    // Basic smoke test - page has content
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });
  
  test('marketplace page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`, { timeout: 10000 });
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
  });
  
  test('auth page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`, { timeout: 10000 });
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
  });
});
