# HTTP/2 Protocol Error Fix for Nykaa/Myntra Scraping

## 🔴 Problem Identified

### Error Message
```
net::ERR_HTTP2_PROTOCOL_ERROR at https://www.nykaa.com/...
net::ERR_HTTP2_PROTOCOL_ERROR at https://www.myntra.com/...
```

### Root Cause
Nykaa and Myntra have **advanced anti-bot protection** that:
1. Detects automated browsers (Playwright/Puppeteer) at the HTTP/2 protocol level
2. Blocks requests that don't look like real human browsers
3. Checks for automation markers (navigator.webdriver, missing plugins, etc.)
4. Analyzes browser fingerprints and behavior patterns

## ✅ Solutions Implemented

### 1. Enhanced Browser Launch Arguments
Added more stealth flags to hide automation:
```javascript
args: [
  "--no-sandbox", 
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--no-first-run",
  "--no-zygote",
  "--disable-gpu",
  "--disable-web-security",
  "--disable-features=IsolateOrigins,site-per-process",
  "--flag-switches-begin --disable-site-isolation-trials --flag-switches-end"
]
```

### 2. Realistic Browser Context
Changed to Indian locale and realistic headers:
```javascript
{
  viewport: { width: 1920, height: 1080 },
  locale: "en-IN",
  timezoneId: "Asia/Kolkata",
  bypassCSP: true,
  ignoreHTTPSErrors: true,
  extraHTTPHeaders: {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1"
  }
}
```

### 3. Advanced Stealth Scripts
Enhanced the init script to hide more automation markers:
- Set `navigator.webdriver = undefined` (not false)
- Added realistic plugins array (PDF Plugin, Chrome PDF Viewer, Native Client)
- Set proper languages: `['en-IN', 'en-GB', 'en-US', 'en']`
- Added complete `window.chrome` object with runtime, loadTimes, csi
- Added realistic screen properties (1920x1080)
- Mocked battery API
- Deleted `navigator.__proto__.webdriver`

### 4. Changed Navigation Strategy
**Before:** Used `networkidle` which caused HTTP/2 errors
**After:** Use `load` for Nykaa/Myntra, with fallback handling:
```javascript
const waitUntil = /nykaa|myntra/.test(host) ? "load" : "domcontentloaded";
await page.goto(url, { waitUntil, timeout: 60000 });
```

### 5. HTTP/2 Error Fallback
Added specific handling for HTTP/2 protocol errors:
```javascript
if (navError.message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
  // Close page and create new one
  await page.close();
  const newPage = await context.newPage();
  await newPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
}
```

### 6. Human-Like Behavior Simulation
For Nykaa/Myntra, simulate human actions:
```javascript
// Random mouse movement
await page.mouse.move(
  Math.floor(Math.random() * 500) + 100,
  Math.floor(Math.random() * 500) + 100
);

// Scroll down to trigger lazy loading
await page.evaluate(() => {
  window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
});

// Scroll back up
await page.evaluate(() => {
  window.scrollTo(0, 0);
});
```

### 7. Enhanced Logging
Added detailed logging to track navigation:
```javascript
console.log(`[Playwright] Navigating to ${url} with waitUntil="${waitUntil}"`);
console.log(`[Playwright] Navigation successful, status: ${response?.status()}`);
console.warn(`[Playwright] Navigation error: ${navError.message}`);
```

### 8. User Experience Improvements
Added frontend notifications:
- Shows "⏳ This may take 20-30 seconds..." for Nykaa/Myntra
- Displays helpful tips if scraping fails
- Better error messages

## 📊 Expected Results

### Before Fix
```
❌ ERR_HTTP2_PROTOCOL_ERROR
❌ No product data extracted
❌ hasTitle: false, hasPrice: false, hasImage: false
```

### After Fix
```
✅ Navigation successful, status: 200
✅ Product data extracted
✅ hasTitle: true, hasPrice: true, hasImage: true
```

## 🧪 Testing Instructions

### 1. Restart Server
```bash
cd server
npm run dev
```

### 2. Test Nykaa URL
```
https://www.nykaa.com/dot-key-vitamin-c-e-super-bright-moisturizer/p/2793280?productId=2793282&skuId=2793280&pps=1
```

### 3. Watch Server Logs
Look for:
```
[Playwright] Navigating to https://www.nykaa.com/...
[Playwright] Navigation successful, status: 200
[Scraper Debug] www.nykaa.com: { hasTitle: true, hasPrice: true, ... }
[Scraper] Successfully extracted product data via Playwright
```

### 4. Expected Timeline
- **Amazon/Flipkart**: 1-3 seconds (static scraping)
- **Nykaa/Myntra**: 20-30 seconds (Playwright with stealth)

## ⚠️ Important Notes

### Why It Might Still Fail
Even with all these improvements, Nykaa/Myntra might still block requests because:

1. **IP-Based Blocking**: They may block datacenter IPs or detect too many requests from same IP
2. **Advanced Fingerprinting**: They use sophisticated browser fingerprinting beyond what we can spoof
3. **Machine Learning Detection**: They may use ML models to detect automation patterns
4. **Rate Limiting**: Too many requests in short time triggers blocks

### Fallback Options
If scraping still fails:

1. **Manual Entry**: Users can copy/paste product details manually
2. **Browser Extension**: Consider building a browser extension that runs in user's real browser
3. **Official APIs**: Check if Nykaa/Myntra offer official product APIs
4. **Proxy Rotation**: Use residential proxies (requires paid service)
5. **CAPTCHA Solving**: Integrate CAPTCHA solving service (expensive)

### Legal Considerations
- Web scraping may violate Terms of Service
- Always respect robots.txt
- Consider rate limiting to avoid overloading servers
- Use official APIs when available

## 🔧 Troubleshooting

### If HTTP/2 Error Persists
1. Check if Chromium is properly installed: `npx playwright install chromium`
2. Try with headless: false to see what's happening visually
3. Check server logs for detailed error messages
4. Try a different Nykaa/Myntra product URL
5. Clear browser cache and cookies

### Debug Script
Use the visual debug script:
```bash
cd server
node test-nykaa-scrape.js
```

This opens a visible browser window so you can see exactly what's happening.

## 📝 Files Modified

1. **server/src/routes/wishlist.js**
   - Enhanced browser launch args (lines 392-404)
   - Updated browser context with Indian locale (lines 408-430)
   - Advanced stealth scripts (lines 435-494)
   - Changed navigation strategy (lines 514-553)
   - Added human behavior simulation (lines 536-560)
   - Enhanced error logging throughout

2. **client/src/components/WishlistScraper.jsx**
   - Added user notifications for slow sites (lines 31-39)
   - Better error handling with helpful tips (lines 62-67)

## 🎯 Success Metrics

The fix is successful if:
- ✅ No HTTP/2 protocol errors in logs
- ✅ Navigation completes with status 200
- ✅ Product title, price, and image are extracted
- ✅ Scraping completes within 30 seconds
- ✅ User sees extracted data in the form

## 🚀 Next Steps

1. **Test thoroughly** with multiple Nykaa/Myntra URLs
2. **Monitor success rate** over time (sites may update their protection)
3. **Consider alternatives** if success rate is too low:
   - Browser extension approach
   - Official API integration
   - Manual entry only
4. **Add rate limiting** to avoid IP blocks
5. **Implement caching** to reduce repeated scraping

---

**Remember**: Web scraping is a cat-and-mouse game. Sites continuously update their anti-bot protection, so this solution may need periodic updates.