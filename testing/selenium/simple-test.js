import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

console.log('\n🔍 Simple ChromeDriver Test\n');

console.log('Step 1: Importing selenium-webdriver... ✓');

console.log('Step 2: Creating Chrome options...');
const options = new chrome.Options();
options.addArguments('--disable-gpu');
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');
console.log('  ✓ Chrome options created');

console.log('\nStep 3: Creating WebDriver (this might take 10-30 seconds)...');
console.log('  Note: Chrome browser should open...\n');

let driver;

try {
  // Add timeout
  const createDriverPromise = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  // Wait with timeout
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
  );
  
  driver = await Promise.race([createDriverPromise, timeoutPromise]);
  
  console.log('  ✓ WebDriver created successfully!');
  console.log('  ✓ Chrome browser opened!');
  
  console.log('\nStep 4: Testing navigation...');
  await driver.get('https://www.google.com');
  console.log('  ✓ Navigation works!');
  
  const title = await driver.getTitle();
  console.log('  Page title:', title);
  
  console.log('\n✅ All tests passed! ChromeDriver is working!\n');
  console.log('You can now run: npm test\n');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error('\n🔧 Troubleshooting:\n');
  
  if (error.message.includes('Timeout')) {
    console.error('  • ChromeDriver is taking too long to start');
    console.error('  • This usually means Chrome version mismatch');
    console.error('\n  Solutions:');
    console.error('  1. Update ChromeDriver: npm install chromedriver@latest');
    console.error('  2. Check Chrome version: chrome://version');
    console.error('  3. Try running as administrator');
  } else if (error.message.includes('PATH')) {
    console.error('  • ChromeDriver not found in PATH');
    console.error('\n  Solution:');
    console.error('  npm install chromedriver@latest');
  } else if (error.message.includes('session')) {
    console.error('  • Chrome browser version mismatch with ChromeDriver');
    console.error('\n  Solutions:');
    console.error('  1. Update Chrome browser to latest version');
    console.error('  2. Update ChromeDriver: npm install chromedriver@latest');
  } else {
    console.error('  • Unknown error');
    console.error('  • Full error:', error.stack);
  }
  
  console.error('\n');
} finally {
  if (driver) {
    console.log('Closing browser...');
    await driver.quit();
    console.log('✓ Browser closed\n');
  }
  process.exit(driver ? 0 : 1);
}

