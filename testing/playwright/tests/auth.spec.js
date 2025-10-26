import { test, expect } from '@playwright/test';
import { config } from '../config.js';

test.describe('Authentication Tests', () => {
  
  test('1. User Registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Wait for registration form - your app says "Create Your Account"
    await expect(page.locator('h1:has-text("Create Your Account")')).toBeVisible({ timeout: 10000 });
    
    // Fill registration form
    const newUser = config.users.newUser;
    
    // Select role first (required in your app)
    await page.check('input[value="goal_setter"]');
    
    // Fill form fields
    await page.fill('input[name="name"]', newUser.name);
    await page.fill('input[name="email"]', newUser.email);
    
    // Password fields
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill(newUser.password); // Password
      await passwordInputs[1].fill(newUser.password); // Confirm password
    }
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    // Verify successful registration (check if redirected away from register page)
    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes('/register');
    
    if (isSuccess) {
      console.log('✓ User registration successful, redirected to:', currentUrl);
    } else {
      console.log('⚠️  Still on register page, check for validation errors');
    }
    
    await page.screenshot({ path: 'playwright-report/registration-result.png', fullPage: true });
  });
  
  test('2. Goal Setter Login', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for login form - your app says "Welcome Back"
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 });
    
    // Fill login credentials
    const user = config.users.goalSetter;
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    
    console.log('Logging in as Goal Setter:', user.email);
    
    // Submit form - button text is "Continue"
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('After login, redirected to:', currentUrl);
    
    // If on role selection/dashboard-redirect, wait a bit more
    if (currentUrl.includes('dashboard-redirect') || currentUrl.includes('role-selection')) {
      await page.waitForTimeout(2000);
      
      // Check if role selection is needed
      if (page.url().includes('role-selection')) {
        await page.click('[data-role="goal_setter"], button:has-text("Goal Setter")').catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
    
    // Take screenshot to verify
    await page.screenshot({ path: 'playwright-report/goalsetter-login-result.png', fullPage: true });
    
    // Verify not on login page anymore
    const finalUrl = page.url();
    const loginSuccess = !finalUrl.includes('/login');
    
    if (loginSuccess) {
      console.log('✓ Goal Setter login successful');
    } else {
      console.log('❌ Still on login page - check credentials');
    }
    
    expect(loginSuccess).toBeTruthy();
  });
  
  test('3. Buyer Login', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for login form
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 });
    
    // Fill login credentials
    const user = config.users.buyer;
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    
    console.log('Logging in as Buyer:', user.email);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('After login, redirected to:', currentUrl);
    
    // If on dashboard-redirect or role selection
    if (currentUrl.includes('dashboard-redirect') || currentUrl.includes('role-selection')) {
      await page.waitForTimeout(2000);
      
      if (page.url().includes('role-selection')) {
        await page.click('[data-role="buyer"], button:has-text("Buyer")').catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'playwright-report/buyer-login-result.png', fullPage: true });
    
    // Verify not on login page
    const finalUrl = page.url();
    const loginSuccess = !finalUrl.includes('/login');
    
    if (loginSuccess) {
      console.log('✓ Buyer login successful');
    } else {
      console.log('❌ Still on login page - check credentials');
    }
    
    expect(loginSuccess).toBeTruthy();
  });
  
  test('4. Login with Invalid Credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for login form
    await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible({ timeout: 10000 });
    
    // Try to login with invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error toast/message
    await page.waitForTimeout(3000);
    
    // Should still be on login page
    const currentUrl = page.url();
    const stillOnLogin = currentUrl.includes('/login');
    
    if (stillOnLogin) {
      console.log('✓ Invalid login properly rejected - stayed on login page');
    } else {
      console.log('⚠️  Unexpected: redirected from login with invalid credentials');
    }
    
    await page.screenshot({ path: 'playwright-report/invalid-login.png', fullPage: true });
    
    expect(stillOnLogin).toBeTruthy();
  });
});

