import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔍 Checking Chrome and ChromeDriver Setup\n');

// Check Chrome installation
console.log('1️⃣ Checking Chrome browser...');
try {
  // Common Chrome paths on Windows
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  let chromeFound = false;
  let chromePath = null;
  
  for (const path of chromePaths) {
    if (existsSync(path)) {
      chromeFound = true;
      chromePath = path;
      console.log('  ✓ Chrome found at:', path);
      
      // Try to get Chrome version
      try {
        const version = execSync(`wmic datafile where name="${path.replace(/\\/g, '\\\\')}" get Version /value`, { encoding: 'utf8' });
        console.log('  ✓ Chrome version:', version.trim().split('=')[1] || 'Unknown');
      } catch (e) {
        console.log('  ⚠ Could not determine Chrome version');
      }
      break;
    }
  }
  
  if (!chromeFound) {
    console.log('  ✗ Chrome not found in standard locations');
    console.log('  → Please install Chrome: https://www.google.com/chrome/');
  }
} catch (error) {
  console.log('  ⚠ Error checking Chrome:', error.message);
}

// Check ChromeDriver installation
console.log('\n2️⃣ Checking ChromeDriver...');
try {
  const chromeDriverPath = join(__dirname, 'node_modules', 'chromedriver', 'lib', 'chromedriver', 'chromedriver.exe');
  
  if (existsSync(chromeDriverPath)) {
    console.log('  ✓ ChromeDriver found at:', chromeDriverPath);
    
    // Try to get ChromeDriver version
    try {
      const version = execSync(`"${chromeDriverPath}" --version`, { encoding: 'utf8' });
      console.log('  ✓ ChromeDriver version:', version.trim());
    } catch (e) {
      console.log('  ⚠ Could not determine ChromeDriver version');
    }
  } else {
    console.log('  ✗ ChromeDriver not found at expected location');
    console.log('  → Try: npm install chromedriver@latest');
  }
} catch (error) {
  console.log('  ⚠ Error checking ChromeDriver:', error.message);
}

// Check selenium-webdriver
console.log('\n3️⃣ Checking selenium-webdriver...');
try {
  const seleniumPath = join(__dirname, 'node_modules', 'selenium-webdriver');
  
  if (existsSync(seleniumPath)) {
    console.log('  ✓ selenium-webdriver installed');
  } else {
    console.log('  ✗ selenium-webdriver not found');
    console.log('  → Try: npm install selenium-webdriver');
  }
} catch (error) {
  console.log('  ⚠ Error checking selenium-webdriver:', error.message);
}

// Check for common issues
console.log('\n4️⃣ Common Issues Check...');

// Check if running as admin
try {
  execSync('net session', { stdio: 'ignore' });
  console.log('  ✓ Running with administrator privileges');
} catch {
  console.log('  ⚠ NOT running as administrator');
  console.log('    → Try: Right-click terminal → Run as administrator');
}

// Check PATH
console.log('\n5️⃣ Environment Check...');
console.log('  NODE_VERSION:', process.version);
console.log('  PLATFORM:', process.platform);
console.log('  ARCH:', process.arch);

console.log('\n📋 Summary & Recommendations:\n');
console.log('If Chrome and ChromeDriver are both installed but tests still hang:');
console.log('  1. ✅ Update both: npm install chromedriver@latest');
console.log('  2. ✅ Run terminal as Administrator');
console.log('  3. ✅ Close all Chrome windows and try again');
console.log('  4. ✅ Check Windows Firewall (allow Node.js/Chrome)');
console.log('  5. ✅ Try alternative: Use Playwright instead of Selenium');
console.log('\nAlternative Solution:');
console.log('  Since Selenium is having issues, I can create Playwright tests instead.');
console.log('  Playwright is more reliable on Windows and easier to set up.\n');
console.log('  Would you like me to create Playwright tests? (Y/N)\n');

