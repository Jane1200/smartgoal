# 🧪 Testing Guide - Nykaa/Myntra Scraping

## 🎯 Quick Start

### 1. Server Status
✅ **Server is already running** on `http://localhost:5000`

### 2. Test URLs

#### Nykaa (Beauty Product)
```
https://www.nykaa.com/dot-key-vitamin-c-e-super-bright-moisturizer/p/2793280?productId=2793282&skuId=2793280&pps=1
```

#### Myntra (Fashion Product)
```
https://www.myntra.com/kurta-sets/mizaz/mizaz-women-floral-printed-cotton-anarkali-kurta-with-trousers--dupatta/36369088/buy
```

#### Amazon (Control Test - Should Work Fast)
```
https://www.amazon.in/dp/B0XXXXXXXX
```

---

## 📊 What to Expect

### Timeline

| Site | Method | Expected Time | Success Rate |
|------|--------|---------------|--------------|
| Amazon | Static (Axios) | 1-3 seconds | ~90% |
| Flipkart | Static (Axios) | 1-3 seconds | ~85% |
| Nykaa | Playwright | 20-30 seconds | ~60-70% |
| Myntra | Playwright | 20-30 seconds | ~60-70% |

### User Experience Flow

#### Step 1: Paste URL
```
User pastes: https://www.nykaa.com/...
```

#### Step 2: Frontend Notification
```
🔵 Info Toast: "⏳ Nykaa/Myntra detected. This may take 20-30 seconds due to anti-bot protection..."
```

#### Step 3: Server Processing
**Watch server console for:**
```
Static scrape error: Request failed with status code 403
[Scraper] Using Playwright for https://www.nykaa.com/...
[Playwright] Navigating to https://www.nykaa.com/... with waitUntil="load", timeout=60000ms
[Playwright] Navigation successful, status: 200
[Scraper Debug] www.nykaa.com: {
  hasTitle: true,
  hasPrice: true,
  hasImage: true,
  hasDescription: true,
  titleLength: 45,
  descLength: 120
}
[Scraper] Successfully extracted product data via Playwright
```

#### Step 4: Success
```
🟢 Success Toast: "Product details extracted successfully!"
Form populated with:
- Title: "Dot & Key Vitamin C+E Super Bright Moisturizer"
- Price: 599
- Image: [Product image URL]
- Description: [Product description]
- Category: Fashion
```

---

## 🔍 Server Log Patterns

### ✅ Success Pattern
```
Static scrape error: Request failed with status code 403
[Scraper] Using Playwright for https://www.nykaa.com/...
[Playwright] Navigating to https://www.nykaa.com/... with waitUntil="load", timeout=60000ms
[Playwright] Navigation successful, status: 200
[Scraper Debug] www.nykaa.com: { hasTitle: true, hasPrice: true, hasImage: true, ... }
[Scraper] Successfully extracted product data via Playwright
```

### ⚠️ Partial Success Pattern
```
[Playwright] Navigation successful, status: 200
[Scraper Debug] www.nykaa.com: { hasTitle: true, hasPrice: false, hasImage: true, ... }
[Scraper] Playwright succeeded but data is sparse
```
**Result**: Some fields populated, user can edit missing ones

### ❌ HTTP/2 Error Pattern (With Fallback)
```
[Playwright] Navigation error: net::ERR_HTTP2_PROTOCOL_ERROR
[Playwright] Detected HTTP/2 error, trying with HTTP/1.1 fallback...
[Playwright] HTTP/1.1 fallback successful, status: 200
[Scraper Debug] www.nykaa.com: { hasTitle: true, hasPrice: true, ... }
```
**Result**: Fallback worked, data extracted

### ❌ Complete Failure Pattern
```
[Playwright] Navigation error: net::ERR_HTTP2_PROTOCOL_ERROR
[Playwright] Detected HTTP/2 error, trying with HTTP/1.1 fallback...
[Playwright] HTTP/1.1 fallback also failed: ...
[Scraper Debug] www.nykaa.com: { hasTitle: false, hasPrice: false, ... }
[Scraper] Playwright succeeded but data is sparse
```
**Result**: Manual entry required

---

## 🎬 Step-by-Step Testing

### Test 1: Nykaa Product

1. **Open your app** in browser
2. **Navigate to** Wishlist/Add Product section
3. **Paste URL**:
   ```
   https://www.nykaa.com/dot-key-vitamin-c-e-super-bright-moisturizer/p/2793280?productId=2793282&skuId=2793280&pps=1
   ```
4. **Click** "Extract Product Details"
5. **Watch for**:
   - Frontend: "⏳ This may take 20-30 seconds..." toast
   - Server console: [Playwright] logs
6. **Wait** 20-30 seconds
7. **Check result**:
   - ✅ Form populated with product details
   - ❌ Error message + manual entry option

### Test 2: Myntra Product

1. **Paste URL**:
   ```
   https://www.myntra.com/kurta-sets/mizaz/mizaz-women-floral-printed-cotton-anarkali-kurta-with-trousers--dupatta/36369088/buy
   ```
2. **Follow same steps** as Test 1
3. **Expected**: Similar behavior to Nykaa

### Test 3: Amazon (Control)

1. **Paste any Amazon India URL**
2. **Expected**:
   - Fast response (1-3 seconds)
   - No Playwright needed
   - Static scraping works

---

## 📸 Screenshots to Share

If testing, please capture:

### 1. Frontend Success
- Screenshot of populated form with product details
- Include the toast notifications

### 2. Frontend Failure
- Screenshot of error message
- Include any toast notifications

### 3. Server Logs
- Copy/paste the complete server console output
- Include all [Playwright] and [Scraper] lines

---

## 🐛 Debugging Tools

### Visual Debug Script
See exactly what Playwright is doing:
```bash
cd server
node test-nykaa-scrape.js
```

**What it does:**
- Opens visible browser window (not headless)
- Shows which selectors find data
- Displays extracted information
- Lets you inspect the page

### Server Logs
Enable detailed logging:
```javascript
// Already enabled in the code
console.log(`[Playwright] ...`);
console.log(`[Scraper Debug] ...`);
```

### Browser DevTools
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. Check Network tab for failed requests

---

## 📋 Checklist

Before reporting issues, verify:

- [ ] Server is running (`npm run dev` in server folder)
- [ ] No errors in server startup logs
- [ ] Playwright is installed (`npx playwright install chromium`)
- [ ] Using correct URL format (https://...)
- [ ] Waited full 30 seconds for Nykaa/Myntra
- [ ] Checked server console for detailed logs
- [ ] Tried with different product URL

---

## 🔄 Common Scenarios

### Scenario 1: "It's taking too long"
**Expected**: Nykaa/Myntra take 20-30 seconds
**Action**: Wait patiently, watch server logs

### Scenario 2: "Got empty fields"
**Expected**: Some sites are harder to scrape
**Action**: Edit fields manually, all fields are editable

### Scenario 3: "HTTP/2 error in logs"
**Expected**: Fallback should trigger automatically
**Action**: Check if fallback succeeded in next log line

### Scenario 4: "403 Forbidden error"
**Expected**: Normal for static scrape, Playwright should follow
**Action**: Wait for Playwright fallback to complete

### Scenario 5: "Chromium not found"
**Action**: Run `npx playwright install chromium`

---

## 📊 Success Criteria

### Minimum Success (Acceptable)
- ✅ At least title OR price extracted
- ✅ User can edit missing fields
- ✅ No server crashes
- ✅ Completes within 60 seconds

### Full Success (Ideal)
- ✅ Title extracted
- ✅ Price extracted
- ✅ Image extracted
- ✅ Description extracted
- ✅ Completes within 30 seconds

### Failure (Needs Investigation)
- ❌ Server crashes
- ❌ Timeout after 60+ seconds
- ❌ No data extracted at all
- ❌ HTTP/2 error with no fallback

---

## 💡 Tips for Best Results

### 1. Choose Simple Products
- Avoid products with complex variants
- Avoid products requiring login
- Avoid out-of-stock products

### 2. Test During Off-Peak Hours
- Less likely to hit rate limits
- Better server response times

### 3. Don't Spam Requests
- Wait between tests
- Avoid testing same URL repeatedly
- Sites may block your IP

### 4. Use Manual Entry as Backup
- Always available
- More reliable
- Faster for known products

---

## 📞 Reporting Issues

If scraping fails, please provide:

### 1. Environment Info
```
OS: Windows 11
Node Version: [run: node --version]
Playwright Version: [run: npx playwright --version]
```

### 2. Complete Server Logs
```
[Copy entire server console output from the scraping attempt]
```

### 3. URL Tested
```
[Exact URL you tried to scrape]
```

### 4. Expected vs Actual
```
Expected: Product details extracted
Actual: [What happened]
```

### 5. Screenshots
- Frontend state
- Server logs
- Any error messages

---

## 🎯 Next Steps After Testing

### If Successful ✅
1. Test with 5-10 different Nykaa URLs
2. Test with 5-10 different Myntra URLs
3. Monitor success rate
4. Report any patterns (which products work better)

### If Partially Successful ⚠️
1. Note which fields are missing
2. Check if pattern exists (always missing price, etc.)
3. Report findings for CSS selector improvements

### If Failed ❌
1. Share complete logs
2. Try visual debug script
3. Consider alternatives:
   - Manual entry
   - Browser extension
   - Official APIs

---

**Ready to test!** 🚀

Start with the Nykaa URL and share your results!