import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_USERS = {
  seller: {
    email: 'test-seller@finventory.com',
    password: 'TestPassword123!',
    name: 'Test Seller'
  },
  buyer: {
    email: 'test-buyer@finventory.com',
    password: 'TestPassword123!',
    name: 'Test Buyer'
  }
};

const TEST_LISTING = {
  species: 'Pacific Salmon',
  grade: 'A',
  quantity: '25',
  unit: 'lbs',
  price: '18.50',
  location: 'Fisherman\'s Wharf, San Francisco, CA'
};

// Helper functions
async function signUp(page: Page, email: string, password: string, name: string) {
  await page.goto('/auth');
  
  // Wait for auth form to load
  await page.waitForSelector('[data-testid="auth-form"]', { timeout: 10000 });
  
  // Switch to signup if needed
  const signUpTab = page.locator('text=Sign Up');
  if (await signUpTab.isVisible().catch(() => false)) {
    await signUpTab.click();
  }
  
  // Fill signup form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[name="name"]', name);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect or success state
  await page.waitForTimeout(2000);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth');
  
  // Wait for auth form
  await page.waitForSelector('[data-testid="auth-form"]', { timeout: 10000 });
  
  // Switch to signin if needed
  const signInTab = page.locator('text=Sign In');
  if (await signInTab.isVisible().catch(() => false)) {
    await signInTab.click();
  }
  
  // Fill signin form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForTimeout(2000);
}

async function createListing(page: Page, listing: typeof TEST_LISTING) {
  await page.goto('/suppliers');
  
  // Wait for supplier portal to load
  await page.waitForSelector('text=Create Listing', { timeout: 10000 });
  
  // Click create listing button
  await page.click('text=Create Listing');
  
  // Fill listing form
  await page.fill('input[name="species"]', listing.species);
  await page.selectOption('select[name="grade"]', listing.grade);
  await page.fill('input[name="quantity"]', listing.quantity);
  await page.fill('input[name="price"]', listing.price);
  await page.fill('input[name="location"]', listing.location);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for success
  await page.waitForSelector('text=Listing created successfully', { timeout: 10000 });
}

async function browseMarketplace(page: Page) {
  await page.goto('/marketplace');
  
  // Wait for marketplace to load
  await page.waitForSelector('[data-testid="listing-card"]', { timeout: 10000 });
  
  // Get all listing cards
  const listings = page.locator('[data-testid="listing-card"]');
  const count = await listings.count();
  
  return count;
}

async function viewListingDetail(page: Page, index: number = 0) {
  const listings = page.locator('[data-testid="listing-card"]');
  await listings.nth(index).click();
  
  // Wait for detail page
  await page.waitForSelector('[data-testid="listing-detail"]', { timeout: 10000 });
}

async function placeOrder(page: Page, quantity: string) {
  // On listing detail page
  await page.fill('input[name="order-quantity"]', quantity);
  
  // Select pickup option
  await page.click('text=Pickup');
  
  // Place order
  await page.click('button:has-text("Place Order")');
  
  // Wait for order confirmation
  await page.waitForSelector('text=Order confirmed', { timeout: 10000 });
  
  // Get QR code
  const qrCode = await page.locator('[data-testid="qr-code"]').textContent();
  
  return qrCode;
}

async function viewMyOrders(page: Page) {
  await page.goto('/orders');
  
  // Wait for orders page
  await page.waitForSelector('[data-testid="orders-list"]', { timeout: 10000 });
  
  // Get order count
  const orders = page.locator('[data-testid="order-item"]');
  return await orders.count();
}

// ============================================
// TEST SUITE: Full Workflow
// ============================================

test.describe('Finventory E2E: Full Workflow', () => {
  
  test('Complete buyer-seller workflow', async ({ browser }) => {
    // Create separate contexts for seller and buyer
    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();
    
    const sellerPage = await sellerContext.newPage();
    const buyerPage = await buyerContext.newPage();
    
    try {
      // ===== STEP 1: Seller signs up =====
      await test.step('Seller signs up', async () => {
        await signUp(
          sellerPage, 
          TEST_USERS.seller.email, 
          TEST_USERS.seller.password, 
          TEST_USERS.seller.name
        );
        
        // Verify logged in
        await expect(sellerPage.locator('text=' + TEST_USERS.seller.name)).toBeVisible();
      });
      
      // ===== STEP 2: Seller creates listing =====
      let _listingId: string | null = null;
      await test.step('Seller creates Grade A listing', async () => {
        await createListing(sellerPage, TEST_LISTING);
        
        // Verify listing appears on seller dashboard
        await sellerPage.goto('/suppliers');
        await expect(sellerPage.locator('text=' + TEST_LISTING.species)).toBeVisible();
        
        // Capture listing ID from URL or data attribute
        _listingId = await sellerPage.locator('[data-testid="listing-id"]').first().getAttribute('data-id');
      });
      
      // ===== STEP 3: Buyer signs up =====
      await test.step('Buyer signs up', async () => {
        await signUp(
          buyerPage, 
          TEST_USERS.buyer.email, 
          TEST_USERS.buyer.password, 
          TEST_USERS.buyer.name
        );
        
        await expect(buyerPage.locator('text=' + TEST_USERS.buyer.name)).toBeVisible();
      });
      
      // ===== STEP 4: Buyer browses marketplace =====
      await test.step('Buyer browses marketplace', async () => {
        const listingCount = await browseMarketplace(buyerPage);
        expect(listingCount).toBeGreaterThan(0);
        
        // Verify our listing is visible
        await expect(buyerPage.locator('text=' + TEST_LISTING.species)).toBeVisible();
      });
      
      // ===== STEP 5: Buyer filters by grade =====
      await test.step('Buyer filters listings by grade', async () => {
        await buyerPage.selectOption('select[name="grade-filter"]', 'A');
        await buyerPage.waitForTimeout(500);
        
        // Verify filtered results
        const filteredListings = buyerPage.locator('[data-testid="listing-card"]');
        const count = await filteredListings.count();
        expect(count).toBeGreaterThan(0);
      });
      
      // ===== STEP 6: Buyer views listing detail =====
      await test.step('Buyer views listing detail', async () => {
        await viewListingDetail(buyerPage, 0);
        
        // Verify details
        await expect(buyerPage.locator('text=' + TEST_LISTING.species)).toBeVisible();
        await expect(buyerPage.locator('text=' + TEST_LISTING.grade)).toBeVisible();
        await expect(buyerPage.locator('text=' + TEST_LISTING.price)).toBeVisible();
      });
      
      // ===== STEP 7: Buyer places order =====
      let qrCode: string | null = null;
      await test.step('Buyer places order', async () => {
        qrCode = await placeOrder(buyerPage, '5');
        expect(qrCode).toBeTruthy();
        
        // Verify order appears in My Orders
        const orderCount = await viewMyOrders(buyerPage);
        expect(orderCount).toBeGreaterThan(0);
      });
      
      // ===== STEP 8: Seller sees order on dashboard =====
      await test.step('Seller sees pending order', async () => {
        await sellerPage.goto('/suppliers');
        await expect(sellerPage.locator('text=Pending Orders')).toBeVisible();
        await expect(sellerPage.locator('text=1 pending')).toBeVisible();
      });
      
      // ===== STEP 9: Seller confirms pickup with QR =====
      await test.step('Seller confirms pickup', async () => {
        await sellerPage.click('text=Scan QR Code');
        
        // Enter QR code
        await sellerPage.fill('input[name="qr-code"]', qrCode!);
        await sellerPage.click('button:has-text("Confirm Pickup")');
        
        // Verify success
        await expect(sellerPage.locator('text=Pickup confirmed')).toBeVisible();
      });
      
      // ===== STEP 10: Buyer sees completed order =====
      await test.step('Buyer sees completed order', async () => {
        await buyerPage.goto('/orders');
        await expect(buyerPage.locator('text=Picked Up')).toBeVisible();
      });
      
    } finally {
      await sellerContext.close();
      await buyerContext.close();
    }
  });
});

test.describe('Finventory E2E: Authentication Flows', () => {
  
  test('User can sign up and sign in', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    
    await test.step('Navigate to auth page', async () => {
      await page.goto('/auth');
      await expect(page.locator('text=Sign In')).toBeVisible();
    });
    
    await test.step('Sign up new user', async () => {
      await page.click('text=Sign Up');
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', 'TestPass123!');
      await page.fill('input[name="name"]', 'Test User');
      await page.click('button[type="submit"]');
      
      // Should redirect or show success
      await page.waitForTimeout(2000);
    });
    
    await test.step('Sign out', async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Sign Out');
      
      await expect(page.locator('text=Sign In')).toBeVisible();
    });
    
    await test.step('Sign in existing user', async () => {
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Verify logged in
      await expect(page.locator('text=Test User')).toBeVisible();
    });
  });
  
  test('Protected routes redirect to auth', async ({ page }) => {
    await test.step('Try to access orders without auth', async () => {
      await page.goto('/orders');
      
      // Should redirect to auth
      await expect(page).toHaveURL(/.*auth/);
    });
    
    await test.step('Try to access supplier portal without auth', async () => {
      await page.goto('/suppliers');
      
      // Should redirect to auth
      await expect(page).toHaveURL(/.*auth/);
    });
  });
});

test.describe('Finventory E2E: Listing Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Sign in as seller before each test
    await signIn(page, TEST_USERS.seller.email, TEST_USERS.seller.password);
  });
  
  test('Create Grade A listing', async ({ page }) => {
    await test.step('Navigate to supplier portal', async () => {
      await page.goto('/suppliers');
      await expect(page.locator('text=Create Listing')).toBeVisible();
    });
    
    await test.step('Fill listing form', async () => {
      await page.click('text=Create Listing');
      
      await page.fill('input[name="species"]', 'Atlantic Salmon');
      await page.selectOption('select[name="grade"]', 'A');
      await page.fill('input[name="quantity"]', '50');
      await page.fill('input[name="price"]', '12.00');
      await page.fill('input[name="location"]', 'Boston Harbor, MA');
    });
    
    await test.step('Submit listing', async () => {
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Listing created successfully')).toBeVisible();
    });
    
    await test.step('Verify listing appears', async () => {
      await expect(page.locator('text=Atlantic Salmon')).toBeVisible();
      await expect(page.locator('text=50')).toBeVisible();
    });
  });
  
  test('Create Sushi Grade listing requires certification', async ({ page }) => {
    await page.goto('/suppliers');
    await page.click('text=Create Listing');
    
    await test.step('Try to create sushi grade without cert', async () => {
      await page.fill('input[name="species"]', 'Bluefin Tuna');
      await page.selectOption('select[name="grade"]', 'sushi');
      await page.fill('input[name="quantity"]', '10');
      await page.fill('input[name="price"]', '65.00');
      
      // Try to submit without cert
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('text=Sushi certification required')).toBeVisible();
    });
    
    await test.step('Add certification and submit', async () => {
      await page.fill('input[name="sushi-cert"]', 'SC-2024-001');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Listing created successfully')).toBeVisible();
    });
  });
  
  test('View and manage listings', async ({ page }) => {
    await page.goto('/suppliers');
    
    await test.step('View active listings', async () => {
      await expect(page.locator('text=Active Listings')).toBeVisible();
      
      const listings = page.locator('[data-testid="listing-item"]');
      const count = await listings.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
    
    await test.step('Edit listing', async () => {
      // Click edit on first listing
      await page.locator('[data-testid="edit-listing"]').first().click();
      
      // Update price
      await page.fill('input[name="price"]', '20.00');
      await page.click('button:has-text("Update")');
      
      await expect(page.locator('text=Listing updated')).toBeVisible();
    });
  });
});

test.describe('Finventory E2E: Marketplace Browsing', () => {
  
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
  });
  
  test('Browse all listings', async ({ page }) => {
    await page.goto('/marketplace');
    
    await test.step('Listings load', async () => {
      await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
    });
    
    await test.step('Listings show correct info', async () => {
      const firstCard = page.locator('[data-testid="listing-card"]').first();
      
      await expect(firstCard.locator('text=Grade')).toBeVisible();
      await expect(firstCard.locator('text=$')).toBeVisible();
    });
  });
  
  test('Filter by species', async ({ page }) => {
    await page.goto('/marketplace');
    
    await test.step('Filter for salmon', async () => {
      await page.fill('input[name="search"]', 'salmon');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(500);
      
      // Verify only salmon listings shown
      const listings = page.locator('[data-testid="listing-card"]');
      const count = await listings.count();
      
      for (let i = 0; i < count; i++) {
        const text = await listings.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('salmon');
      }
    });
  });
  
  test('Filter by grade', async ({ page }) => {
    await page.goto('/marketplace');
    
    await test.step('Filter for Grade A', async () => {
      await page.selectOption('select[name="grade"]', 'A');
      await page.waitForTimeout(500);
      
      // Verify only Grade A listings
      const listings = page.locator('[data-testid="listing-card"]');
      const count = await listings.count();
      
      for (let i = 0; i < count; i++) {
        const text = await listings.nth(i).textContent();
        expect(text).toContain('A');
      }
    });
  });
  
  test('Filter by location', async ({ page }) => {
    await page.goto('/marketplace');
    
    await test.step('Set location filter', async () => {
      await page.fill('input[name="location"]', 'San Francisco');
      await page.fill('input[name="radius"]', '50');
      await page.click('button:has-text("Apply Filters")');
      
      await page.waitForTimeout(500);
      
      // Verify distance displayed on listings
      await expect(page.locator('text=miles away')).toBeVisible();
    });
  });
  
  test('View listing detail', async ({ page }) => {
    await page.goto('/marketplace');
    
    await test.step('Click on listing', async () => {
      await page.locator('[data-testid="listing-card"]').first().click();
      
      // Verify detail page loads
      await expect(page.locator('[data-testid="listing-detail"]')).toBeVisible();
    });
    
    await test.step('Verify detail content', async () => {
      await expect(page.locator('text=Species')).toBeVisible();
      await expect(page.locator('text=Grade')).toBeVisible();
      await expect(page.locator('text=Quantity')).toBeVisible();
      await expect(page.locator('text=Price')).toBeVisible();
      await expect(page.locator('text=Seller')).toBeVisible();
    });
    
    await test.step('Can place order from detail', async () => {
      await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
      await expect(page.locator('input[name="quantity"]')).toBeVisible();
    });
  });
});

test.describe('Finventory E2E: Order Management', () => {
  
  test('Place order and view in My Orders', async ({ browser }) => {
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    
    try {
      await signIn(buyerPage, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
      
      await test.step('Navigate to marketplace', async () => {
        await buyerPage.goto('/marketplace');
        await expect(buyerPage.locator('[data-testid="listing-card"]').first()).toBeVisible();
      });
      
      await test.step('Place order', async () => {
        await buyerPage.locator('[data-testid="listing-card"]').first().click();
        await buyerPage.fill('input[name="quantity"]', '3');
        await buyerPage.click('text=Place Order');
        
        await expect(buyerPage.locator('text=Order confirmed')).toBeVisible();
      });
      
      await test.step('View in My Orders', async () => {
        await buyerPage.goto('/orders');
        
        await expect(buyerPage.locator('[data-testid="order-item"]')).toBeVisible();
        await expect(buyerPage.locator('text=Pending')).toBeVisible();
      });
      
    } finally {
      await buyerContext.close();
    }
  });
  
  test('Cancel pending order', async ({ browser }) => {
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    
    try {
      await signIn(buyerPage, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
      
      await test.step('Go to My Orders', async () => {
        await buyerPage.goto('/orders');
      });
      
      await test.step('Cancel first pending order', async () => {
        await buyerPage.locator('text=Cancel').first().click();
        
        // Confirm cancellation
        await buyerPage.click('button:has-text("Yes, Cancel")');
        
        await expect(buyerPage.locator('text=Cancelled')).toBeVisible();
      });
      
    } finally {
      await buyerContext.close();
    }
  });
  
  test('Cannot cancel picked up order', async ({ browser }) => {
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    
    try {
      await signIn(buyerPage, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
      await buyerPage.goto('/orders');
      
      await test.step('Try to cancel completed order', async () => {
        // Find a picked up order
        const pickedUpOrder = buyerPage.locator('[data-testid="order-item"]:has-text("Picked Up")').first();
        
        if (await pickedUpOrder.isVisible().catch(() => false)) {
          // Verify no cancel button
          const cancelButton = pickedUpOrder.locator('text=Cancel');
          await expect(cancelButton).not.toBeVisible();
        }
      });
      
    } finally {
      await buyerContext.close();
    }
  });
});

test.describe('Finventory E2E: Responsive Design', () => {
  
  test('Marketplace is responsive on mobile', async ({ page }) => {
    await signIn(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/marketplace');
    
    await test.step('Listings display correctly on mobile', async () => {
      await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
      
      // Verify no horizontal overflow
      const body = page.locator('body');
      const scrollWidth = await body.evaluate(el => el.scrollWidth);
      const clientWidth = await body.evaluate(el => el.clientWidth);
      
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    });
    
    await test.step('Navigation is accessible', async () => {
      await expect(page.locator('button[aria-label="Menu"], .hamburger')).toBeVisible();
    });
  });
  
  test('Order flow works on mobile', async ({ page }) => {
    await signIn(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/marketplace');
    
    await test.step('Can place order on mobile', async () => {
      await page.locator('[data-testid="listing-card"]').first().click();
      
      await page.fill('input[name="quantity"]', '2');
      await page.click('text=Place Order');
      
      await expect(page.locator('text=Order confirmed')).toBeVisible();
    });
  });
});

test.describe('Finventory E2E: Error Handling', () => {
  
  test('Shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
  
  test('Shows error when ordering too much quantity', async ({ page }) => {
    await signIn(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    
    await page.goto('/marketplace');
    await page.locator('[data-testid="listing-card"]').first().click();
    
    await page.fill('input[name="quantity"]', '99999');
    await page.click('text=Place Order');
    
    await expect(page.locator('text=Not enough quantity')).toBeVisible();
  });
  
  test('Shows 404 for non-existent listing', async ({ page }) => {
    await signIn(page, TEST_USERS.buyer.email, TEST_USERS.buyer.password);
    
    await page.goto('/marketplace/non-existent-id');
    
    await expect(page.locator('text=Not Found')).toBeVisible();
    await expect(page.locator('text=This listing does not exist')).toBeVisible();
  });
});

// Global test hooks
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await page.screenshot({ 
      path: `test-results/${testInfo.title.replace(/\s+/g, '_')}.png`,
      fullPage: true 
    });
  }
});
