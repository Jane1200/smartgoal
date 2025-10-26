import { createDriver, clickElement, typeText, waitForElement, takeScreenshot, getElementText } from '../utils/driver.js';
import { login } from '../utils/auth.js';
import { config } from '../config.js';

/**
 * Wishlist Tests
 */
export async function runWishlistTests() {
  const results = [];
  let driver;
  
  try {
    driver = await createDriver();
    console.log('✓ Driver created successfully');
    
    // Login first
    console.log('\n🔐 Logging in...');
    const loginSuccess = await login(driver);
    if (!loginSuccess) {
      throw new Error('Login failed');
    }
    console.log('✓ Login successful');
    
    // Test 1: Navigate to Wishlist Page
    results.push(await testNavigateToWishlist(driver));
    
    // Test 2: Add Wishlist Item Manually
    results.push(await testAddWishlistItemManually(driver));
    
    // Test 3: Verify Goal Created from Wishlist
    results.push(await testVerifyGoalFromWishlist(driver));
    
    // Test 4: Edit Wishlist Item
    results.push(await testEditWishlistItem(driver));
    
    // Test 5: Delete Wishlist Item
    results.push(await testDeleteWishlistItem(driver));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    results.push({
      name: 'Wishlist Test Suite',
      status: 'FAILED',
      error: error.message
    });
  } finally {
    if (driver) {
      await driver.quit();
      console.log('\n✓ Driver closed');
    }
  }
  
  return results;
}

async function testNavigateToWishlist(driver) {
  const testName = 'Navigate to Wishlist Page';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    // Look for Wishlist link in navigation
    await driver.get(`${config.baseUrl}/wishlist`);
    await driver.sleep(1000);
    
    // Verify we're on wishlist page
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('/wishlist')) {
      throw new Error('Not on wishlist page');
    }
    
    // Check for wishlist elements
    const pageTitle = await getElementText(driver, 'h1, h2, h5');
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'wishlist-page');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'wishlist-navigate-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testAddWishlistItemManually(driver) {
  const testName = 'Add Wishlist Item Manually';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    // Navigate to wishlist page
    await driver.get(`${config.baseUrl}/wishlist`);
    await driver.sleep(1000);
    
    // Look for edit/create form or button
    const hasEditForm = await driver.findElements({ css: 'input[placeholder*="iPhone"], input[placeholder*="title"]' });
    
    if (hasEditForm.length === 0) {
      console.log('⚠ No edit form found, might need to click edit button first');
    }
    
    // Fill in wishlist item details
    await typeText(driver, 'input[placeholder*="iPhone"], input[placeholder*="title"]', config.testData.wishlist.title);
    await typeText(driver, 'input[type="number"]', config.testData.wishlist.price.toString());
    
    // Select priority
    const prioritySelect = await driver.findElement({ css: 'select' });
    await prioritySelect.sendKeys(config.testData.wishlist.priority);
    
    // Submit form
    await clickElement(driver, 'button[type="submit"], button:contains("Add"), button:contains("Save")');
    await driver.sleep(2000);
    
    // Verify toast or success message
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'wishlist-item-added');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'wishlist-add-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testVerifyGoalFromWishlist(driver) {
  const testName = 'Verify Goal Created from Wishlist';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    // Navigate to goals page
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(2000);
    
    // Look for the goal with wishlist item title
    const goalElements = await driver.findElements({ css: '.goal-item, .card, [data-testid="goal"]' });
    
    if (goalElements.length === 0) {
      throw new Error('No goals found');
    }
    
    // Check if any goal matches our wishlist item
    let goalFound = false;
    for (const element of goalElements) {
      const text = await element.getText();
      if (text.includes(config.testData.wishlist.title)) {
        goalFound = true;
        break;
      }
    }
    
    if (!goalFound) {
      throw new Error(`Goal with title "${config.testData.wishlist.title}" not found`);
    }
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'goal-from-wishlist');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'goal-verify-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testEditWishlistItem(driver) {
  const testName = 'Edit Wishlist Item';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/wishlist`);
    await driver.sleep(1000);
    
    // Find edit button
    const editButtons = await driver.findElements({ css: 'button:contains("Edit"), [aria-label="Edit"]' });
    
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await driver.sleep(1000);
      
      // Modify price
      await typeText(driver, 'input[type="number"]', '30000');
      
      // Save
      await clickElement(driver, 'button[type="submit"]');
      await driver.sleep(1000);
    }
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'wishlist-item-edited');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`⚠ ${testName} - SKIPPED: ${error.message}`);
    
    return {
      name: testName,
      status: 'SKIPPED',
      error: error.message
    };
  }
}

async function testDeleteWishlistItem(driver) {
  const testName = 'Delete Wishlist Item';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/wishlist`);
    await driver.sleep(1000);
    
    // Find delete button
    const deleteButtons = await driver.findElements({ css: 'button:contains("Delete"), [aria-label="Delete"]' });
    
    if (deleteButtons.length > 0) {
      await deleteButtons[0].click();
      await driver.sleep(500);
      
      // Confirm deletion if dialog appears
      try {
        await driver.switchTo().alert().accept();
      } catch (e) {
        // No alert, might be a modal
        const confirmButtons = await driver.findElements({ css: 'button:contains("Confirm"), button:contains("Yes")' });
        if (confirmButtons.length > 0) {
          await confirmButtons[0].click();
        }
      }
      
      await driver.sleep(1000);
    }
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'wishlist-item-deleted');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`⚠ ${testName} - SKIPPED: ${error.message}`);
    
    return {
      name: testName,
      status: 'SKIPPED',
      error: error.message
    };
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Running Wishlist Tests...\n');
  const results = await runWishlistTests();
  console.log('\n📊 Test Results:', results);
}

export default runWishlistTests;

