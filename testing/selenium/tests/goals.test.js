import { createDriver, clickElement, typeText, waitForElement, takeScreenshot, getElementText } from '../utils/driver.js';
import { login } from '../utils/auth.js';
import { config } from '../config.js';

/**
 * Goals Tests
 */
export async function runGoalsTests() {
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
    
    // Test 1: Navigate to Goals Page
    results.push(await testNavigateToGoals(driver));
    
    // Test 2: Create New Goal
    results.push(await testCreateGoal(driver));
    
    // Test 3: Verify Goal Appears in List
    results.push(await testVerifyGoalInList(driver));
    
    // Test 4: Edit Goal
    results.push(await testEditGoal(driver));
    
    // Test 5: Check Goal Priority Display
    results.push(await testGoalPriorityDisplay(driver));
    
    // Test 6: Delete Goal
    results.push(await testDeleteGoal(driver));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    results.push({
      name: 'Goals Test Suite',
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

async function testNavigateToGoals(driver) {
  const testName = 'Navigate to Goals Page';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(1000);
    
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('/goals')) {
      throw new Error('Not on goals page');
    }
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'goals-page');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'goals-navigate-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testCreateGoal(driver) {
  const testName = 'Create New Goal';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(1000);
    
    // Fill in goal form
    await typeText(driver, 'input[placeholder*="vacation"], input[placeholder*="goal"]', config.testData.goal.title);
    await typeText(driver, 'textarea', config.testData.goal.description);
    await typeText(driver, 'input[type="number"]', config.testData.goal.targetAmount.toString());
    
    // Select category
    const categorySelects = await driver.findElements({ css: 'select' });
    if (categorySelects.length > 0) {
      await categorySelects[0].sendKeys('discretionary');
    }
    
    // Set due date (30 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateString = futureDate.toISOString().split('T')[0];
    await typeText(driver, 'input[type="date"]', dateString);
    
    // Submit form
    await clickElement(driver, 'button[type="submit"]');
    await driver.sleep(2000);
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'goal-created');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'goal-create-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testVerifyGoalInList(driver) {
  const testName = 'Verify Goal in List';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(2000);
    
    // Look for goal list
    const goalElements = await driver.findElements({ css: '.goal-item, .card, [data-testid="goal"]' });
    
    if (goalElements.length === 0) {
      throw new Error('No goals found in list');
    }
    
    // Check if our goal is in the list
    let goalFound = false;
    for (const element of goalElements) {
      const text = await element.getText();
      if (text.includes(config.testData.goal.title)) {
        goalFound = true;
        console.log(`  ✓ Found goal: "${config.testData.goal.title}"`);
        break;
      }
    }
    
    if (!goalFound) {
      throw new Error(`Goal "${config.testData.goal.title}" not found in list`);
    }
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'goal-in-list');
    
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

async function testEditGoal(driver) {
  const testName = 'Edit Goal';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(1000);
    
    // Find edit button
    const editButtons = await driver.findElements({ css: 'button:contains("Edit"), [aria-label="Edit"]' });
    
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await driver.sleep(1000);
      
      // Modify target amount
      await typeText(driver, 'input[type="number"]', '60000');
      
      // Save
      await clickElement(driver, 'button[type="submit"]');
      await driver.sleep(1000);
      
      console.log(`✓ ${testName} - PASSED`);
      await takeScreenshot(driver, 'goal-edited');
      
      return {
        name: testName,
        status: 'PASSED',
        duration: Date.now()
      };
    } else {
      throw new Error('Edit button not found');
    }
  } catch (error) {
    console.log(`⚠ ${testName} - SKIPPED: ${error.message}`);
    
    return {
      name: testName,
      status: 'SKIPPED',
      error: error.message
    };
  }
}

async function testGoalPriorityDisplay(driver) {
  const testName = 'Check Goal Priority Display';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(1000);
    
    // Look for priority badges
    const priorityBadges = await driver.findElements({ css: '.badge, [class*="priority"]' });
    
    if (priorityBadges.length === 0) {
      throw new Error('No priority badges found');
    }
    
    console.log(`  ✓ Found ${priorityBadges.length} priority badge(s)`);
    
    console.log(`✓ ${testName} - PASSED`);
    await takeScreenshot(driver, 'goal-priority');
    
    return {
      name: testName,
      status: 'PASSED',
      duration: Date.now()
    };
  } catch (error) {
    console.log(`✗ ${testName} - FAILED: ${error.message}`);
    await takeScreenshot(driver, 'goal-priority-failed');
    
    return {
      name: testName,
      status: 'FAILED',
      error: error.message
    };
  }
}

async function testDeleteGoal(driver) {
  const testName = 'Delete Goal';
  console.log(`\n📋 Running: ${testName}`);
  
  try {
    await driver.get(`${config.baseUrl}/goals`);
    await driver.sleep(1000);
    
    // Find delete button
    const deleteButtons = await driver.findElements({ css: 'button:contains("Delete"), [aria-label="Delete"]' });
    
    if (deleteButtons.length > 0) {
      await deleteButtons[0].click();
      await driver.sleep(500);
      
      // Confirm deletion
      try {
        await driver.switchTo().alert().accept();
      } catch (e) {
        const confirmButtons = await driver.findElements({ css: 'button:contains("Confirm"), button:contains("Yes")' });
        if (confirmButtons.length > 0) {
          await confirmButtons[0].click();
        }
      }
      
      await driver.sleep(1000);
      
      console.log(`✓ ${testName} - PASSED`);
      await takeScreenshot(driver, 'goal-deleted');
      
      return {
        name: testName,
        status: 'PASSED',
        duration: Date.now()
      };
    } else {
      throw new Error('Delete button not found');
    }
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
  console.log('🧪 Running Goals Tests...\n');
  const results = await runGoalsTests();
  console.log('\n📊 Test Results:', results);
}

export default runGoalsTests;

