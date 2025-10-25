/**
 * Test script for the enhanced meaningful text validator
 * Open browser console (F12) and paste this entire file to test
 * 
 * Or manually in console:
 * await import('@/utils/meaningfulTextValidator.js').then(m => {
 *   console.log(m.validateMeaningfulTextSync('title', 'xmnzpqrwxyabcd'));
 * })
 */

// Test cases
const testCases = [
  // SHOULD FAIL - Random words
  { text: 'xmnzpqrwxyabcd', shouldFail: true, description: '15-char random word' },
  { text: 'bzzzzzzzpppqqq', shouldFail: true, description: '14-char consonant cluster' },
  { text: 'xyzpqrwmnabc', shouldFail: true, description: '12-char random word' },
  { text: 'qwrtypsdfghjkl', shouldFail: true, description: '14-char keyboard pattern' },
  { text: 'mnbvcxzlkjhgf', shouldFail: true, description: '13-char random consonants' },
  
  // SHOULD PASS - Real words
  { text: 'iPhone', shouldFail: false, description: 'Brand name' },
  { text: 'beautiful', shouldFail: false, description: 'Real word (9 chars)' },
  { text: 'technology', shouldFail: false, description: 'Real word (10 chars)' },
  { text: 'Samsung Galaxy', shouldFail: false, description: 'Real brand + model' },
  { text: 'Mint condition headphones', shouldFail: false, description: 'Real description' },
  { text: 'relationship', shouldFail: false, description: 'Real word (12 chars)' },
  { text: 'amazing product', shouldFail: false, description: 'Real words with -ing pattern' },
  
  // EDGE CASES
  { text: 'abc def', shouldFail: true, description: 'Too many short words' },
  { text: 'aaaa bbbb', shouldFail: true, description: 'Repeated characters (spam)' },
  { text: 'test', shouldFail: false, description: 'Short real word' },
];

// Run tests
console.log('=== MEANINGFUL TEXT VALIDATOR TEST SUITE ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  // Import and test
  import('@/utils/meaningfulTextValidator.js').then(m => {
    const result = m.validateMeaningfulTextSync('title', testCase.text);
    const hasError = !!result;
    const testPassed = hasError === testCase.shouldFail;
    
    const icon = testPassed ? '✅' : '❌';
    const status = testPassed ? 'PASS' : 'FAIL';
    const expectedResult = testCase.shouldFail ? 'REJECTED' : 'ACCEPTED';
    const actualResult = hasError ? 'REJECTED' : 'ACCEPTED';
    
    console.log(`${icon} Test ${index + 1}: ${status}`);
    console.log(`   Input: "${testCase.text}"`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${expectedResult}`);
    console.log(`   Actual: ${actualResult}`);
    if (hasError) {
      console.log(`   Error: ${result}`);
    }
    console.log();
    
    if (testPassed) {
      passed++;
    } else {
      failed++;
    }
    
    if (index === testCases.length - 1) {
      console.log(`\n=== RESULTS ===`);
      console.log(`✅ Passed: ${passed}/${testCases.length}`);
      console.log(`❌ Failed: ${failed}/${testCases.length}`);
      if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Validator is working correctly.');
      }
    }
  }).catch(err => {
    console.error('Error loading validator:', err);
  });
});

// Alternative: Manual test (run this in console after validator is loaded)
// Usage: testWord('xmnzpqrwxyabcd') or testWord('iPhone')
window.testWord = async (word) => {
  const m = await import('@/utils/meaningfulTextValidator.js');
  const result = m.validateMeaningfulTextSync('title', word);
  console.log(`Testing: "${word}"`);
  if (result) {
    console.log(`❌ REJECTED: ${result}`);
  } else {
    console.log(`✅ ACCEPTED`);
  }
  return result;
};

console.log('\n💡 You can also test individual words:');
console.log('   testWord("xmnzpqrwxyabcd")');
console.log('   testWord("iPhone")');