# Product Scraping Improvements for Nykaa and Myntra

## Problem
The product scraper was only working for Amazon and Flipkart URLs. When users tried to add products from Nykaa or Myntra, the scraper failed to extract product details (title, price, image, description).

## Root Cause
The scraper was using generic CSS selectors that worked well for Amazon and Flipkart but didn't match the specific HTML structure of Nykaa and Myntra websites. These sites use different class names and element structures for their product pages.

## Solution Implemented

### 1. **Site-Specific Title Extraction**
Added dedicated selectors for each platform:
- **Nykaa**: `h1.css-1gc4w7j`, `h1[class*="product-title"]`, `.css-1gc4w7j`
- **Myntra**: `h1.pdp-title`, `h1.pdp-name`, `.pdp-title`

### 2. **Site-Specific Description Extraction**
- **Nykaa**: `.css-w0a4gp`, `[class*="product-description"]`
- **Myntra**: `.pdp-product-description-content`, `.pdp-description`

### 3. **Site-Specific Image Extraction**
- **Nykaa**: `img.css-11gn9r6`, `.css-11gn9r6 img`, `[class*="image-viewer"] img`
- **Myntra**: `.image-grid-image`, `.pdp-image img`, `img.pdp-img`, `.image-grid img`

### 4. **Site-Specific Price Extraction**
- **Nykaa**: `.css-1d0jf8e`, `.css-111z9ua`, `[class*="final-price"]`, `[class*="selling-price"]`
- **Myntra**: `.pdp-price strong`, `.pdp-price`, `.pdp-discount-container .pdp-price`

### 5. **Enhanced Playwright Scraper**
Added site-specific wait selectors for JavaScript-heavy sites:
- **Nykaa**: Waits for `h1.css-1gc4w7j`, `.css-1d0jf8e` (price element)
- **Myntra**: Waits for `h1.pdp-title`, `.pdp-price`

This ensures the page is fully loaded before attempting to scrape data.

### 6. **Category Detection**
Updated category heuristics:
- **Nykaa**: Defaults to "Fashion" (for beauty/cosmetics products)
- **Myntra**: Defaults to "Fashion"
- **Flipkart**: Defaults to "Electronics"

### 7. **Playwright Installation**
Added Playwright as a dependency in `package.json` to enable dynamic scraping for JavaScript-heavy sites like Nykaa and Myntra.

## Files Modified

1. **`server/src/routes/wishlist.js`**
   - Enhanced `parseHtmlContent()` function with site-specific selectors
   - Updated `scrapeWithPlaywright()` function with site-specific wait selectors
   - Improved category detection logic

2. **`server/package.json`**
   - Added `playwright: ^1.49.1` as a dependency

## How It Works

### Scraping Flow:
1. **Static Scraping (Fast)**: First attempts to scrape using Axios + Cheerio
   - Works well for server-rendered pages
   - Fast and lightweight
   
2. **Playwright Fallback (Robust)**: If static scraping fails or returns incomplete data
   - Launches a headless browser
   - Waits for JavaScript to render the page
   - Extracts data from the fully rendered DOM
   - Includes anti-bot measures (random user agents, delays, etc.)

### Site Detection:
The scraper detects the website from the URL hostname and applies the appropriate selectors:
```javascript
if (/nykaa/.test(host)) {
  // Use Nykaa-specific selectors
} else if (/myntra/.test(host)) {
  // Use Myntra-specific selectors
} else {
  // Use generic selectors
}
```

## Testing

To test the improvements:

1. **Start the server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Try scraping products from**:
   - Nykaa: `https://www.nykaa.com/[product-url]`
   - Myntra: `https://www.myntra.com/[product-url]`
   - Amazon: `https://www.amazon.in/[product-url]`
   - Flipkart: `https://www.flipkart.com/[product-url]`

3. **Expected behavior**:
   - Product title, price, image, and description should be extracted
   - If static scraping fails, Playwright will automatically retry
   - User can edit any field before adding to wishlist

## Notes

- **Playwright browsers**: The first time you run the scraper with Playwright, it will download the Chromium browser (~150MB). This is a one-time download.
- **Performance**: Static scraping is faster but may fail on JavaScript-heavy sites. Playwright is slower but more reliable.
- **Anti-bot protection**: Some sites may still block automated scraping. The code includes basic anti-bot measures, but sophisticated protection systems may still detect it.
- **CSS class names**: Websites frequently update their CSS class names. If scraping breaks in the future, the selectors may need to be updated.

## Future Improvements

1. Add support for more e-commerce sites (Ajio, Tata Cliq, etc.)
2. Implement caching to avoid re-scraping the same URL
3. Add retry logic with exponential backoff
4. Implement more sophisticated anti-bot measures
5. Add user feedback when scraping takes longer than expected