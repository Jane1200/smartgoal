import { test, expect } from '@playwright/test';
import { config } from './config.js';

test.describe('🔍 Diagnostics', () => {
  
  test('1. Check if client is running', async ({ page }) => {
    try {
      await page.goto(config.baseUrl, { timeout: 5000 });
      console.log('✅ Client is running on', config.baseUrl);
    } catch (error) {
      console.log('❌ Client is NOT running on', config.baseUrl);
      console.log('   Start client: cd client && npm run dev');
      throw error;
    }
  });
  
  test('2. Check if server is running', async ({ request }) => {
    try {
      const response = await request.get(config.apiUrl + '/api/health').catch(() => null);
      if (response) {
        console.log('✅ Server is running on', config.apiUrl);
      } else {
        console.log('⚠️  Server health check failed, but might be running');
      }
    } catch (error) {
      console.log('⚠️  Could not verify server, but may be running');
    }
  });
  
  test('3. Check login page loads', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const hasEmailInput = await page.locator('input[type="email"]').count();
    const hasPasswordInput = await page.locator('input[type="password"]').count();
    const hasSubmitButton = await page.locator('button[type="submit"]').count();
    
    console.log('Login page elements:');
    console.log('  Email input:', hasEmailInput > 0 ? '✅' : '❌');
    console.log('  Password input:', hasPasswordInput > 0 ? '✅' : '❌');
    console.log('  Submit button:', hasSubmitButton > 0 ? '✅' : '❌');
    
    await page.screenshot({ path: 'playwright-report/diagnostic-login.png', fullPage: true });
    
    expect(hasEmailInput).toBeGreaterThan(0);
    expect(hasPasswordInput).toBeGreaterThan(0);
    expect(hasSubmitButton).toBeGreaterThan(0);
  });
  
  test('4. Test goal setter login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const user = config.users.goalSetter;
    console.log('Testing credentials:', user.email);
    
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Wait for either success or error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('After login, URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page - credentials may be wrong');
      console.log('   Check if user exists:', user.email);
      console.log('   Check password:', user.password);
      await page.screenshot({ path: 'playwright-report/diagnostic-login-failed.png', fullPage: true });
    } else {
      console.log('✅ Login successful - redirected to:', currentUrl);
      await page.screenshot({ path: 'playwright-report/diagnostic-login-success.png', fullPage: true });
    }
  });
  
  test('5. Test buyer login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const user = config.users.buyer;
    console.log('Testing credentials:', user.email);
    
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('After login, URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page - credentials may be wrong');
      console.log('   Check if user exists:', user.email);
      await page.screenshot({ path: 'playwright-report/diagnostic-buyer-login-failed.png', fullPage: true });
    } else {
      console.log('✅ Login successful - redirected to:', currentUrl);
      await page.screenshot({ path: 'playwright-report/diagnostic-buyer-login-success.png', fullPage: true });
    }
  });
  
  test('6. Check available routes', async ({ page }) => {
    const routes = [
      '/login',
      '/register',
      '/goals',
      '/wishlist',
      '/marketplace',
      '/buyer-marketplace',
      '/cart',
      '/buyer-cart',
      '/checkout'
    ];
    
    console.log('\nChecking routes:');
    
    for (const route of routes) {
      try {
        const response = await page.goto(config.baseUrl + route, { timeout: 5000 });
        const status = response?.status() || 'unknown';
        console.log(`  ${route}: ${status === 200 ? '✅' : status}`);
      } catch (error) {
        console.log(`  ${route}: ❌ Failed`);
      }
    }
  });
});

