// Test script for Nykaa scraping
import { chromium } from 'playwright';

const url = 'https://www.nykaa.com/dot-key-vitamin-c-e-super-bright-moisturizer/p/2793280?productId=2793282&skuId=2793280&pps=1';

async function testNykaaScrape() {
  console.log('🚀 Starting Nykaa scrape test...\n');
  
  const browser = await chromium.launch({
    headless: false, // Set to false to see what's happening
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    const page = await context.newPage();

    // Enhanced stealth
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      window.chrome = {
        runtime: {},
      };
    });

    console.log('📄 Navigating to URL...');
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    
    console.log('⏳ Waiting for page to render...');
    await page.waitForTimeout(3000);

    // Try to find title
    console.log('\n🔍 Looking for title...');
    const titleSelectors = [
      'h1[class*="css"]',
      'h1',
      '[class*="product-title"]',
      '[class*="ProductTitle"]'
    ];
    
    for (const sel of titleSelectors) {
      const element = await page.$(sel);
      if (element) {
        const text = await element.textContent();
        console.log(`  ✅ Found with selector "${sel}": ${text?.trim().substring(0, 50)}...`);
        break;
      } else {
        console.log(`  ❌ Not found: ${sel}`);
      }
    }

    // Try to find price
    console.log('\n💰 Looking for price...');
    const priceSelectors = [
      '[class*="css"][class*="price"]',
      '[class*="final"]',
      '[class*="Final"]',
      '[class*="selling"]',
      '[class*="price"]'
    ];
    
    for (const sel of priceSelectors) {
      const element = await page.$(sel);
      if (element) {
        const text = await element.textContent();
        console.log(`  ✅ Found with selector "${sel}": ${text?.trim()}`);
        break;
      } else {
        console.log(`  ❌ Not found: ${sel}`);
      }
    }

    // Try to find image
    console.log('\n🖼️  Looking for image...');
    const imageSelectors = [
      'img[class*="css"]',
      '[class*="image"] img',
      'img[alt*="product"]'
    ];
    
    for (const sel of imageSelectors) {
      const element = await page.$(sel);
      if (element) {
        const src = await element.getAttribute('src');
        console.log(`  ✅ Found with selector "${sel}": ${src?.substring(0, 60)}...`);
        break;
      } else {
        console.log(`  ❌ Not found: ${sel}`);
      }
    }

    // Check meta tags
    console.log('\n📋 Checking meta tags...');
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content');
    
    console.log(`  og:title: ${ogTitle?.substring(0, 50) || 'Not found'}...`);
    console.log(`  og:image: ${ogImage?.substring(0, 60) || 'Not found'}...`);
    console.log(`  og:description: ${ogDesc?.substring(0, 50) || 'Not found'}...`);

    console.log('\n✅ Test complete! Check the browser window for visual confirmation.');
    console.log('Press Ctrl+C to close the browser and exit.');

    // Keep browser open for inspection
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Browser will stay open until you close it manually
  }
}

testNykaaScrape();