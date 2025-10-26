import colors from 'colors';
import { runWishlistTests } from './tests/wishlist.test.js';
import { runGoalsTests } from './tests/goals.test.js';
import { generateReport } from './generate-report.js';

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(colors.cyan.bold('\n╔════════════════════════════════════════╗'));
  console.log(colors.cyan.bold('║   SmartGoal Selenium Test Suite       ║'));
  console.log(colors.cyan.bold('╚════════════════════════════════════════╝\n'));
  
  const startTime = Date.now();
  const allResults = [];
  
  try {
    // Check if servers are running
    console.log(colors.yellow('⚡ Pre-flight checks...'));
    console.log(colors.gray('   Make sure both client (port 5173) and server (port 5000) are running!'));
    console.log(colors.gray('   Client: npm run dev (in client folder)'));
    console.log(colors.gray('   Server: npm start (in server folder)\n'));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run Wishlist Tests
    console.log(colors.cyan.bold('\n📋 Running Wishlist Tests...'));
    console.log(colors.gray('─'.repeat(50)));
    const wishlistResults = await runWishlistTests();
    allResults.push(...wishlistResults);
    
    // Run Goals Tests
    console.log(colors.cyan.bold('\n🎯 Running Goals Tests...'));
    console.log(colors.gray('─'.repeat(50)));
    const goalsResults = await runGoalsTests();
    allResults.push(...goalsResults);
    
    // Calculate statistics
    const totalTests = allResults.length;
    const passed = allResults.filter(r => r.status === 'PASSED').length;
    const failed = allResults.filter(r => r.status === 'FAILED').length;
    const skipped = allResults.filter(r => r.status === 'SKIPPED').length;
    const duration = Date.now() - startTime;
    
    // Print summary
    console.log(colors.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(colors.cyan.bold('║         Test Summary                   ║'));
    console.log(colors.cyan.bold('╚════════════════════════════════════════╝\n'));
    
    console.log(colors.white(`  Total Tests:    ${totalTests}`));
    console.log(colors.green(`  ✓ Passed:       ${passed}`));
    console.log(colors.red(`  ✗ Failed:       ${failed}`));
    console.log(colors.yellow(`  ⚠ Skipped:      ${skipped}`));
    console.log(colors.gray(`  Duration:       ${(duration / 1000).toFixed(2)}s\n`));
    
    // Print detailed results
    if (failed > 0) {
      console.log(colors.red.bold('\n❌ Failed Tests:\n'));
      allResults
        .filter(r => r.status === 'FAILED')
        .forEach(result => {
          console.log(colors.red(`  ✗ ${result.name}`));
          console.log(colors.gray(`    Error: ${result.error}\n`));
        });
    }
    
    if (skipped > 0) {
      console.log(colors.yellow.bold('\n⚠️  Skipped Tests:\n'));
      allResults
        .filter(r => r.status === 'SKIPPED')
        .forEach(result => {
          console.log(colors.yellow(`  ⚠ ${result.name}`));
          console.log(colors.gray(`    Reason: ${result.error}\n`));
        });
    }
    
    // Generate report
    console.log(colors.cyan('\n📊 Generating test report...'));
    await generateReport(allResults, {
      totalTests,
      passed,
      failed,
      skipped,
      duration
    });
    
    console.log(colors.green('\n✓ Test report generated: ./reports/test-report.html'));
    console.log(colors.gray('  Open this file in your browser to view the detailed report.\n'));
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(colors.red.bold('\n❌ Test runner failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();

