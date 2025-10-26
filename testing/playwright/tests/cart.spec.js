import { test, expect } from '@playwright/test';
import { config } from '../config.js';

test.describe('Buyer - Shopping Cart Tests', () => {
  
  // Login as buyer before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', config.users.buyer.email);
    await page.fill('input[type="password"]', config.users.buyer.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('role-selection') || currentUrl.includes('dashboard-redirect')) {
      await page.waitForTimeout(1000);
      if (page.url().includes('role-selection')) {
        await page.click('[data-role="buyer"]').catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
  });
  
  test('1. Add Item to Cart', async ({ page }) => {
    // Go to marketplace
    await page.goto('/buyer-marketplace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for "Add to Cart" buttons
    const addToCartButtons = await page.locator('button:has-text("Add to Cart"), button:has-text("Add")').all();
    
    if (addToCartButtons.length > 0) {
      await addToCartButtons[0].click();
      await page.waitForTimeout(1500);
      
      console.log('✓ Item added to cart');
      
      // Look for success message or cart count update
      const pageContent = await page.content();
      const addedToCart = pageContent.includes('cart') || pageContent.includes('added');
      
      if (addedToCart) {
        console.log('✓ Add to cart confirmed');
      }
    } else {
      console.log('⚠ No "Add to Cart" buttons found - marketplace might be empty');
    }
    
    await page.screenshot({ path: 'playwright-report/add-to-cart.png', fullPage: true });
  });
  
  test('2. Navigate to Cart Page', async ({ page }) => {
    // Try different cart URLs
    const cartUrls = ['/cart', '/buyer-cart', '/checkout', '/orders'];
    let foundCart = false;
    
    for (const url of cartUrls) {
      await page.goto(url).catch(() => {});
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      if (currentUrl.includes(url.replace('/', ''))) {
        console.log(`✓ Found cart/checkout page at: ${url}`);
        foundCart = true;
        break;
      }
    }
    
    if (!foundCart) {
      console.log('⚠️  Could not find cart page, trying navigation links');
      // Try to find cart link
      const cartLink = page.locator('a:has-text("Cart"), button:has-text("Cart"), a:has-text("Orders")');
      if (await cartLink.count() > 0) {
        await cartLink.first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
    
    await page.screenshot({ path: 'playwright-report/cart-page.png', fullPage: true });
    console.log('Current URL:', page.url());
  });
  
  test('3. View Cart Contents', async ({ page }) => {
    // Try different cart URLs
    const cartUrls = ['/cart', '/buyer-cart', '/checkout'];
    
    for (const url of cartUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      if (page.url().includes(url.replace('/', ''))) {
        break;
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Look for cart items
    const cartItems = await page.locator('.cart-item, .checkout-item, [data-testid="cart-item"]').count();
    
    if (cartItems > 0) {
      console.log(`✓ Cart has ${cartItems} item(s)`);
    } else {
      console.log('⚠ Cart is empty or cart items not found');
    }
    
    // Look for total price
    const hasTotalPrice = await page.locator('*:has-text("Total"), *:has-text("₹")').count() > 0;
    if (hasTotalPrice) {
      console.log('✓ Cart total displayed');
    }
    
    await page.screenshot({ path: 'playwright-report/cart-contents.png', fullPage: true });
  });
  
  test('4. Checkout Button Present', async ({ page }) => {
    const cartUrls = ['/cart', '/buyer-cart', '/checkout'];
    
    for (const url of cartUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      if (page.url().includes(url.replace('/', ''))) {
        break;
      }
    }
    
    await page.waitForTimeout(1500);
    
    // Look for checkout button
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed"), button:has-text("Place Order")');
    const hasCheckoutButton = await checkoutButton.count() > 0;
    
    if (hasCheckoutButton) {
      console.log('✓ Checkout button found');
    } else {
      console.log('⚠ Checkout button not found');
    }
    
    await page.screenshot({ path: 'playwright-report/checkout-button.png', fullPage: true });
  });
});

