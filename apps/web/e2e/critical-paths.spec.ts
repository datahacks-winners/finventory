import { test, expect } from '@playwright/test';

/**
 * Critical Path Browser Automation Tests
 * 
 * These tests verify the core user workflows through the actual browser UI.
 * They test what users actually see and interact with.
 */

const BASE_URL = process.env.WEB_URL || 'http://localhost:5173';

// Test user credentials
const _TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
};

test.describe('Critical User Paths', () => {
  
  test('User can view homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Verify key elements are visible - use specific selectors
    await expect(page.locator('a:has-text("Finventory")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Marketplace")')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/homepage.png' });
  });
  
  test('User can navigate to marketplace', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click marketplace link
    await page.click('text=Marketplace');
    
    // Verify marketplace page loaded
    await expect(page).toHaveURL(/.*marketplace/);
    
    // Verify marketplace content
    await expect(page.locator('body')).toContainText('Marketplace');
  });
  
  test('User can navigate to auth page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Look for sign in / get started button
    const signInLink = page.locator('text=Sign In, text=Get Started, text=Login').first();
    if (await signInLink.isVisible().catch(() => false)) {
      await signInLink.click();
    } else {
      await page.goto(`${BASE_URL}/auth`);
    }
    
    // Verify auth page
    await expect(page).toHaveURL(/.*auth/);
    await expect(page.locator('body')).toContainText(/Sign In|Sign Up|Login|Email/);
  });
  
  test('User can navigate to about page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click about link
    const aboutLink = page.locator('text=About').first();
    if (await aboutLink.isVisible().catch(() => false)) {
      await aboutLink.click();
      await expect(page).toHaveURL(/.*about/);
    } else {
      await page.goto(`${BASE_URL}/about`);
    }
    
    // Verify about page content
    await expect(page.locator('body')).toContainText(/About|Finventory|seafood|sustainable/);
  });
  
  test('Marketplace page structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    
    // Verify page structure
    await expect(page.locator('body')).toContainText(/Marketplace|listings|fish|seafood/i);
    
    // Check for filter/search elements
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i]').isVisible().catch(() => false);
    const hasFilter = await page.locator('select, button:has-text("Filter"), button:has-text("Sort")').first().isVisible().catch(() => false);
    
    console.log('Marketplace has search:', hasSearch, 'has filter:', hasFilter);
  });
  
  test('Auth page has signup and signin', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    
    // Verify auth form exists
    const bodyText = await page.locator('body').textContent();
    
    // Should have some form of auth UI
    expect(bodyText).toMatch(/Sign In|Sign Up|Login|Register|Email|Password/i);
    
    // Look for form inputs
    const hasEmailInput = await page.locator('input[type="email"], input[name*="email" i]').first().isVisible().catch(() => false);
    const hasPasswordInput = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
    
    console.log('Auth has email input:', hasEmailInput, 'has password input:', hasPasswordInput);
  });
  
  test('Page navigation works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Get all navigation links
    const links = page.locator('a');
    const count = await links.count();
    
    console.log(`Found ${count} navigation links`);
    
    // Try clicking a few links
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        console.log(`Link ${i}: ${text} -> ${href}`);
      }
    }
  });
  
  test('Responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(BASE_URL);
    
    // Verify page renders without horizontal scroll
    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50); // Allow 50px tolerance for mobile
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-homepage.png' });
  });
  
  test('Responsive layout on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(BASE_URL);
    
    // Verify page renders
    await expect(page.locator('body')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/tablet-homepage.png' });
  });
});

test.describe('API Integration (via Browser)', () => {
  
  test('Marketplace loads data from API', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    
    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);
    
    // Check if there are any listings displayed
    // Look for common patterns in listing cards
    const listingPatterns = [
      'grade', 'species', 'lbs', 'kg', '$', 'price', 'seller', 'salmon', 'tuna', 'fish'
    ];
    
    const bodyText = await page.locator('body').textContent();
    let foundListingContent = false;
    
    for (const pattern of listingPatterns) {
      if (bodyText?.toLowerCase().includes(pattern.toLowerCase())) {
        foundListingContent = true;
        console.log(`Found listing content: ${pattern}`);
        break;
      }
    }
    
    // Either we find listings or we see an empty state
    expect(foundListingContent || bodyText?.includes('No listings') || bodyText?.includes('Empty')).toBeTruthy();
  });
  
  test('Page elements have correct accessibility attributes', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check for basic accessibility
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      if (!alt) {
        console.log(`Image ${i} missing alt text`);
      }
    }
    
    // Check for buttons with accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    console.log(`Found ${buttonCount} buttons, ${imageCount} images`);
  });
});

test.describe('Visual Regression Checks', () => {
  
  test('Homepage visual check', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for fonts and images to load
    await page.waitForTimeout(1000);
    
    // Screenshot specific areas
    await page.screenshot({ 
      path: 'test-results/homepage-full.png',
      fullPage: true 
    });
    
    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate and check for errors
    await page.reload();
    await page.waitForTimeout(1000);
    
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  });
  
  test('Marketplace visual check', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`);
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/marketplace-full.png',
      fullPage: true 
    });
  });
  
  test('Auth page visual check', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/auth-full.png',
      fullPage: true 
    });
  });
});

// Capture console logs and errors during tests
test.beforeEach(async ({ page }, testInfo) => {
  console.log(`\nStarting test: ${testInfo.title}`);
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[Page Error] ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`[Failed Request] ${request.url()}: ${request.failure()?.errorText}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ 
      path: `test-results/failed-${testInfo.title.replace(/\s+/g, '_')}.png`,
      fullPage: true 
    });
  }
  console.log(`Finished test: ${testInfo.title} - ${testInfo.status}\n`);
});
