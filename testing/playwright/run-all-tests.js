import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportDir = path.join(__dirname, 'playwright-report');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner(text) {
  const line = '='.repeat(60);
  log('\n' + line, 'cyan');
  log(text, 'bright');
  log(line + '\n', 'cyan');
}

async function checkServers() {
  log('🔍 Checking if servers are running...', 'cyan');
  
  try {
    // Check client server
    const clientResponse = await fetch('http://localhost:5173');
    if (clientResponse.ok) {
      log('✅ Client server is running (http://localhost:5173)', 'green');
    }
  } catch (error) {
    log('❌ Client server is not running!', 'red');
    log('   Please start the client server first:', 'yellow');
    log('   cd client && npm run dev\n', 'yellow');
    return false;
  }
  
  try {
    // Check API server
    const apiResponse = await fetch('http://localhost:5000/api/health', {
      method: 'GET'
    }).catch(() => null);
    
    if (apiResponse) {
      log('✅ API server is running (http://localhost:5000)', 'green');
    } else {
      log('⚠️  API server might not be running', 'yellow');
      log('   Tests may fail if server is required', 'yellow');
    }
  } catch (error) {
    log('⚠️  Could not verify API server', 'yellow');
  }
  
  return true;
}

async function createReportDirectory() {
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
    log('📁 Created report directory', 'cyan');
  }
}

async function runTests() {
  banner('🎭 Running Playwright Tests');
  
  const serversRunning = await checkServers();
  if (!serversRunning) {
    log('\n❌ Cannot proceed without servers running\n', 'red');
    process.exit(1);
  }
  
  await createReportDirectory();
  
  log('\n🚀 Starting test execution...\n', 'cyan');
  
  const testSuites = [
    { name: 'Authentication Tests', command: 'npx playwright test tests/auth.spec.js' },
    { name: 'Goals Tests', command: 'npx playwright test tests/goals.spec.js' },
    { name: 'Wishlist Tests', command: 'npx playwright test tests/wishlist.spec.js' },
    { name: 'Marketplace Tests', command: 'npx playwright test tests/marketplace.spec.js' },
    { name: 'Cart Tests', command: 'npx playwright test tests/cart.spec.js' }
  ];
  
  const results = [];
  
  for (const suite of testSuites) {
    log(`\n${'─'.repeat(60)}`, 'cyan');
    log(`Running: ${suite.name}`, 'bright');
    log('─'.repeat(60) + '\n', 'cyan');
    
    try {
      const { stdout, stderr } = await execPromise(suite.command, {
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: '1' }
      });
      
      console.log(stdout);
      if (stderr) console.error(stderr);
      
      results.push({ name: suite.name, status: 'passed', output: stdout });
      log(`\n✅ ${suite.name} - PASSED\n`, 'green');
      
    } catch (error) {
      // Playwright returns non-zero exit code on test failures
      // But we still want to continue with other suites
      console.log(error.stdout || error.message);
      if (error.stderr) console.error(error.stderr);
      
      results.push({ name: suite.name, status: 'failed', output: error.stdout || error.message });
      log(`\n⚠️  ${suite.name} - Some tests may have failed (continuing...)\n`, 'yellow');
    }
    
    // Small delay between suites
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function generateReports() {
  banner('📊 Generating Test Reports');
  
  try {
    log('Creating HTML screenshot viewer and markdown report...', 'cyan');
    const { stdout } = await execPromise('node generate-report.js', {
      cwd: __dirname
    });
    console.log(stdout);
    log('✅ Reports generated successfully\n', 'green');
  } catch (error) {
    log('❌ Error generating reports:', 'red');
    console.error(error.message);
  }
}

function printSummary(results) {
  banner('📋 Test Execution Summary');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  
  log(`Total Test Suites: ${total}`, 'bright');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`, passed === total ? 'green' : 'yellow');
  
  log('Test Suite Results:', 'bright');
  results.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const color = result.status === 'passed' ? 'green' : 'red';
    log(`  ${icon} ${result.name}`, color);
  });
  
  log('\n📂 Generated Files:', 'cyan');
  log('  - playwright-report/screenshots.html (HTML Screenshot Viewer)', 'cyan');
  log('  - TEST_REPORT.md (Markdown Report)', 'cyan');
  log('  - playwright-report/index.html (Playwright HTML Report)', 'cyan');
  log('  - test-results.json (JSON Results)', 'cyan');
  
  log('\n💡 Next Steps:', 'magenta');
  log('  1. Open playwright-report/screenshots.html to view screenshots', 'magenta');
  log('  2. Read TEST_REPORT.md for detailed test report', 'magenta');
  log('  3. Run "npm run report" to open Playwright HTML report', 'magenta');
  
  log('');
}

async function main() {
  const startTime = Date.now();
  
  banner('🎯 SmartGoal - Playwright Test Runner');
  
  try {
    // Run all tests
    const results = await runTests();
    
    // Generate reports
    await generateReports();
    
    // Print summary
    printSummary(results);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Total execution time: ${duration}s\n`, 'cyan');
    
    log('✨ Test execution completed!\n', 'green');
    
  } catch (error) {
    log('\n❌ Fatal error during test execution:', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();










