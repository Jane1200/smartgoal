import { createDriver } from './utils/driver.js';
import { config } from './config.js';
import colors from 'colors';

async function runDiagnostics() {
  console.log(colors.cyan.bold('\n🔍 SmartGoal Test Diagnostics\n'));

  // Test 1: Check if servers are reachable
  console.log(colors.yellow('📡 Test 1: Checking servers...'));

  try {
    const clientCheck = await fetch(config.baseUrl);
    console.log(colors.green('✓ Client server reachable at ' + config.baseUrl));
  } catch (error) {
    console.log(colors.red('✗ Client server NOT reachable at ' + config.baseUrl));
    console.log(colors.gray('  Make sure: cd client && npm run dev'));
  }

  try {
    const serverCheck = await fetch(config.apiUrl);
    console.log(colors.green('✓ API server reachable at ' + config.apiUrl));
  } catch (error) {
    console.log(colors.red('✗ API server NOT reachable at ' + config.apiUrl));
    console.log(colors.gray('  Make sure: cd server && npm start'));
  }

  // Test 2: Check ChromeDriver
  console.log(colors.yellow('\n🚗 Test 2: Checking ChromeDriver...'));

  let driver;
  try {
    console.log(colors.gray('  Creating WebDriver instance...'));
    driver = await createDriver();
    console.log(colors.green('✓ ChromeDriver working!'));
    
    // Test 3: Check if can navigate
    console.log(colors.yellow('\n🌐 Test 3: Testing navigation...'));
    await driver.get(config.baseUrl);
    const currentUrl = await driver.getCurrentUrl();
    console.log(colors.green('✓ Navigation working! Current URL: ' + currentUrl));
    
    // Test 4: Check login page
    console.log(colors.yellow('\n🔐 Test 4: Checking login page...'));
    await driver.get(`${config.baseUrl}/login`);
    await driver.sleep(2000);
    
    const emailInput = await driver.findElements({ css: 'input[type="email"]' });
    if (emailInput.length > 0) {
      console.log(colors.green('✓ Login page found with email input'));
    } else {
      console.log(colors.red('✗ Login page missing email input'));
    }
    
  } catch (error) {
    console.log(colors.red('✗ ChromeDriver error: ' + error.message));
    console.log(colors.gray('\n  Try running: npm install chromedriver@latest'));
    console.log(colors.gray('  Error details: ' + error.stack));
  } finally {
    if (driver) {
      await driver.quit();
      console.log(colors.gray('\n✓ Browser closed'));
    }
  }

  // Test 5: Check test user config
  console.log(colors.yellow('\n👤 Test 5: Checking test user configuration...'));
  console.log(colors.gray('  Test user email: ' + config.testUser.email));
  console.log(colors.gray('  Test user password: ' + (config.testUser.password ? '***' : 'NOT SET')));
  console.log(colors.yellow('\n⚠️  Make sure this user exists in your app with role "goal_setter"!'));

  console.log(colors.cyan.bold('\n✅ Diagnostics complete!\n'));
  console.log(colors.gray('If all tests passed, try running: npm test'));
  console.log(colors.gray('If any tests failed, fix those issues first.\n'));
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error(colors.red.bold('\n❌ Diagnostics failed:'), error.message);
  console.error(error.stack);
  process.exit(1);
});

