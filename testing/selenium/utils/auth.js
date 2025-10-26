import { config } from '../config.js';
import { clickElement, typeText, waitForElement } from './driver.js';

/**
 * Login helper function
 */
export async function login(driver, email = config.testUser.email, password = config.testUser.password) {
  try {
    // Navigate to login page
    await driver.get(`${config.baseUrl}/login`);
    
    // Wait for login form
    await waitForElement(driver, 'input[type="email"]');
    
    // Fill in credentials
    await typeText(driver, 'input[type="email"]', email);
    await typeText(driver, 'input[type="password"]', password);
    
    // Click login button
    await clickElement(driver, 'button[type="submit"]');
    
    // Wait for redirect (dashboard or role selection)
    await driver.sleep(2000);
    
    // Check if we're on role selection page
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/role-selection')) {
      // Select goal_setter role
      await clickElement(driver, '[data-role="goal_setter"]');
      await driver.sleep(1000);
    }
    
    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    return false;
  }
}

/**
 * Logout helper function
 */
export async function logout(driver) {
  try {
    // Look for logout button (might be in dropdown or sidebar)
    await clickElement(driver, '[data-testid="logout"], button:contains("Logout"), a:contains("Logout")');
    await driver.sleep(1000);
    return true;
  } catch (error) {
    console.error('Logout failed:', error.message);
    return false;
  }
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(driver) {
  try {
    const currentUrl = await driver.getCurrentUrl();
    return !currentUrl.includes('/login') && !currentUrl.includes('/register');
  } catch (error) {
    return false;
  }
}

export default {
  login,
  logout,
  isLoggedIn
};

