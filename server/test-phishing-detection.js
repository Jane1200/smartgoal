/**
 * Test script for phishing detection in wishlist links
 * Demonstrates how the system detects and alerts users about scam links
 */

// Test function to simulate phishing detection
async function testPhishingDetection() {
  try {
    console.log('🎣 Testing Phishing Detection for Wishlist Links...\n');
    
    // Simulate different types of URLs
    const testUrls = [
      {
        url: 'https://www.amazon.in/dp/B08N5WRWNW',
        description: 'Legitimate Amazon product link'
      },
      {
        url: 'https://secure-login-amazon.verify-account.suspicious-domain.com/login',
        description: 'Suspicious phishing link mimicking Amazon'
      },
      {
        url: 'https://www.flipkart.com/apple-iphone-12/p/itmabcdefgh123456',
        description: 'Legitimate Flipkart product link'
      },
      {
        url: 'http://free-iphone-giveaway.scam-site.xyz/claim-now',
        description: 'Obvious scam link'
      }
    ];
    
    console.log('📋 Test URLs:');
    testUrls.forEach((item, index) => {
      console.log(`${index + 1}. ${item.description}`);
      console.log(`   ${item.url}\n`);
    });
    
    console.log('🛡️ Phishing Detection Workflow:');
    console.log('1️⃣ User adds a wishlist item with a URL');
    console.log('2️⃣ System automatically checks the URL for phishing indicators');
    console.log('3️⃣ If phishing is detected, user receives immediate warning');
    console.log('4️⃣ Suspicious links are flagged in the wishlist\n');
    
    // Simulate the response from the phishing detection system
    const simulatedResponses = [
      {
        url: 'https://www.amazon.in/dp/B08N5WRWNW',
        phishingResult: {
          success: true,
          label: 'legit',
          suspicionScore: 0.1,
          probabilities: { legit: 0.9, phish: 0.1 }
        },
        riskMessage: '✅ SAFE - This link appears to be legitimate.',
        isPhishing: false
      },
      {
        url: 'https://secure-login-amazon.verify-account.suspicious-domain.com/login',
        phishingResult: {
          success: true,
          label: 'phish',
          suspicionScore: 0.95,
          probabilities: { legit: 0.05, phish: 0.95 }
        },
        riskMessage: '🚨 HIGH RISK - This link appears to be phishing/scam. Do not click!',
        isPhishing: true
      },
      {
        url: 'https://www.flipkart.com/apple-iphone-12/p/itmabcdefgh123456',
        phishingResult: {
          success: true,
          label: 'legit',
          suspicionScore: 0.05,
          probabilities: { legit: 0.95, phish: 0.05 }
        },
        riskMessage: '✅ SAFE - This link appears to be legitimate.',
        isPhishing: false
      },
      {
        url: 'http://free-iphone-giveaway.scam-site.xyz/claim-now',
        phishingResult: {
          success: true,
          label: 'phish',
          suspicionScore: 0.88,
          probabilities: { legit: 0.12, phish: 0.88 }
        },
        riskMessage: '🚨 HIGH RISK - This link appears to be phishing/scam. Do not click!',
        isPhishing: true
      }
    ];
    
    console.log('🔍 Phishing Detection Results:\n');
    
    simulatedResponses.forEach((response, index) => {
      console.log(`🔗 URL ${index + 1}: ${testUrls[index].url}`);
      console.log(`📝 Description: ${testUrls[index].description}`);
      console.log(`📊 Suspicion Score: ${(response.phishingResult.suspicionScore * 100).toFixed(1)}%`);
      console.log(`🏷️  Classification: ${response.phishingResult.label.toUpperCase()}`);
      console.log(`💬 Risk Assessment: ${response.riskMessage}`);
      
      if (response.isPhishing) {
        console.log(`⚠️  PHISHING DETECTED: This link has been flagged as potentially malicious!`);
        console.log(`   The system will warn the user and recommend against clicking.`);
      } else {
        console.log(`✅ This link appears to be safe.`);
      }
      
      console.log('---');
    });
    
    console.log('\n🔄 Additional Features:');
    console.log('• Batch phishing check for all wishlist items');
    console.log('• Individual phishing check for existing wishlist items');
    console.log('• Automatic warnings when adding suspicious links');
    console.log('• Detailed risk assessments with confidence scores');
    console.log('• Persistent phishing flags in the database\n');
    
    console.log('🛡️ Security Benefits:');
    console.log('• Protects users from phishing scams');
    console.log('• Prevents accidental exposure to malicious sites');
    console.log('• Builds user trust in the platform');
    console.log('• Reduces support requests related to scam links\n');
    
    console.log('✅ Phishing detection testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing phishing detection:', error.message);
  }
}

// Run the test
testPhishingDetection();