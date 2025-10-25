# Quick Start: Testing Product Scraping

## What Was Fixed
✅ Nykaa product scraping now works  
✅ Myntra product scraping now works  
✅ Amazon and Flipkart continue to work  
✅ Added Playwright for JavaScript-heavy sites  

## How to Test

### 1. Make sure Playwright browsers are installed
```bash
cd server
npx playwright install chromium
```

### 2. Start the server
```bash
cd server
npm run dev
```

### 3. Test with sample URLs

#### Nykaa Example:
```
https://www.nykaa.com/maybelline-new-york-fit-me-matte-poreless-foundation/p/124329
```

#### Myntra Example:
```
https://www.myntra.com/tshirts/roadster/roadster-men-navy-blue-solid-round-neck-t-shirt/1234567/buy
```

#### Amazon Example:
```
https://www.amazon.in/dp/B08CFSZLQ4
```

#### Flipkart Example:
```
https://www.flipkart.com/apple-iphone-13-blue-128-gb/p/itm6c6296e0cbf6e
```

### 4. Using the UI

1. Open the wishlist page in your app
2. Find the "Add Product from URL" section
3. Paste any product URL from the supported sites
4. Click "Extract Product Details"
5. Wait for the scraper to fetch the data (may take 5-15 seconds for Nykaa/Myntra)
6. Review and edit the extracted details if needed
7. Click "Add to Wishlist & Create Savings Goal"

## What Happens Behind the Scenes

### For Amazon & Flipkart:
- **Fast static scraping** (1-3 seconds)
- Uses Axios + Cheerio to parse HTML
- Works because these sites have server-rendered content

### For Nykaa & Myntra:
- **Tries static scraping first** (1-3 seconds)
- If that fails or returns incomplete data:
  - **Falls back to Playwright** (5-15 seconds)
  - Launches headless Chrome browser
  - Waits for JavaScript to render the page
  - Extracts data from fully rendered page

## Troubleshooting

### "Failed to scrape product details"
- **Cause**: The site may be blocking automated requests
- **Solution**: Try again, or manually enter the product details

### "Playwright fallback failed"
- **Cause**: Playwright browsers not installed
- **Solution**: Run `npx playwright install chromium`

### Scraping takes too long
- **Cause**: Playwright is downloading/rendering the page
- **Expected**: First scrape may take 10-15 seconds
- **Normal**: Subsequent scrapes should be faster

### Product details are incomplete
- **Cause**: The website's HTML structure may have changed
- **Solution**: You can manually edit the fields before adding to wishlist

## Supported Sites

| Site | Status | Scraping Method |
|------|--------|----------------|
| Amazon.in | ✅ Working | Static (fast) |
| Flipkart.com | ✅ Working | Static (fast) |
| Nykaa.com | ✅ Working | Playwright (slower) |
| Myntra.com | ✅ Working | Playwright (slower) |
| Ajio.com | ⚠️ Partial | Generic selectors |

## Tips for Best Results

1. **Use direct product URLs**: Avoid URLs with tracking parameters
2. **Wait patiently**: Nykaa/Myntra may take 10-15 seconds
3. **Review before saving**: Always check the extracted data
4. **Edit if needed**: You can modify any field before adding to wishlist
5. **Check the image**: Make sure the product image loaded correctly

## Need Help?

If scraping fails for a specific product:
1. Check the browser console for errors
2. Check the server logs for detailed error messages
3. Try the URL in a regular browser to ensure it's valid
4. Manually add the product if scraping continues to fail