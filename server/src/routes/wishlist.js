import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Wishlist from "../models/Wishlist.js";
import Goal from "../models/Goal.js";
import { requireAuth } from "../middleware/auth.js";
import axios from "axios";
import * as cheerio from "cheerio"; // <-- fixed import for modern cheerio

const router = Router();
router.use(requireAuth);

/* ---------------------------
   Utilities
   --------------------------- */
function absoluteUrl(src, baseUrl) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return `https:${src}`;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

function extractNumberFromString(text) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Prefer numeric sequences that look like full prices (with currency symbol or keywords)
  const pricePatterns = [
    /(?:price|mrp|selling|current|offer|list)\D*([\d,.]+(?:\.\d{1,2})?)/i,
    /₹\s*([\d,.]+)/i,
    /rs\.?\s*([\d,.]+)/i,
    /INR\s*([\d,.]+)/i,
    /USD\s*([\d,.]+)/i,
    /EUR\s*([\d,.]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const priceMatch = cleaned.match(pattern);
    if (priceMatch && priceMatch[1]) {
      const value = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  // Fallback: return first numeric match only if discount-specific keywords are absent
  const discountKeywords = /(discount|save|off|deal|you save)/i;
  if (discountKeywords.test(cleaned)) {
    return null;
  }

  const genericMatch = cleaned.match(/[\d,.]+(?:\.\d{1,2})?/);
  if (!genericMatch) return null;
  const num = parseFloat(genericMatch[0].replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

/* ---------------------------
   parseHtmlContent: improved image checks (data-src, data-lazy)
   --------------------------- */
function parseHtmlContent(html, pageUrl) {
  const $ = cheerio.load(html);

  // JSON-LD detection for Product schema
  let productJson = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const txt = $(el).contents().text();
      if (!txt) return;
      const data = JSON.parse(txt);
      if (Array.isArray(data)) {
        for (const d of data) {
          if (d && d["@type"] && /Product/i.test(d["@type"])) {
            productJson = d;
            break;
          }
        }
      } else if (data && data["@type"] && /Product/i.test(data["@type"])) {
        productJson = data;
      } else if (data && data["@graph"]) {
        for (const d of (data["@graph"] || [])) {
          if (d && d["@type"] && /Product/i.test(d["@type"])) {
            productJson = d;
            break;
          }
        }
      }
    } catch (e) {
      // ignore malformed JSON-LD
    }
  });

  const host = (() => {
    try { return new URL(pageUrl).hostname; } catch { return ""; }
  })();

  // Site-specific title selectors
  let title = productJson?.name || null;
  if (!title) {
    if (/nykaa/.test(host)) {
      title = $('h1[class*="css"]').first().text().trim() ||
              $('h1').first().text().trim() ||
              $('[class*="product-title"]').first().text().trim() ||
              $('[class*="ProductTitle"]').first().text().trim() ||
              $('meta[property="og:title"]').attr("content") ||
              $('meta[name="twitter:title"]').attr("content") ||
              null;
    } else if (/myntra/.test(host)) {
      title = $('h1.pdp-title').text().trim() ||
              $('h1.pdp-name').text().trim() ||
              $('.pdp-title').text().trim() ||
              $('meta[property="og:title"]').attr("content") ||
              null;
    } else {
      title = $('meta[property="og:title"]').attr("content") ||
              $('meta[name="twitter:title"]').attr("content") ||
              $("title").text().trim() ||
              $("h1").first().text().trim() ||
              null;
    }
  }

  // Site-specific description selectors
  let description = productJson?.description || null;
  if (!description) {
    if (/nykaa/.test(host)) {
      description = $('[class*="description"]').first().text().trim() ||
                   $('[class*="Description"]').first().text().trim() ||
                   $('meta[name="description"]').attr("content") ||
                   $('meta[property="og:description"]').attr("content") ||
                   null;
    } else if (/myntra/.test(host)) {
      description = $('.pdp-product-description-content').text().trim() ||
                   $('.pdp-description').text().trim() ||
                   $('meta[name="description"]').attr("content") ||
                   null;
    } else {
      description = $('meta[name="description"]').attr("content") ||
                   $('meta[property="og:description"]').attr("content") ||
                   $(".product-description").first().text().trim() ||
                   null;
    }
  }

  // Image — check src, data-src, data-lazy, data-original, data-srcset
  function findFirstImage() {
    // 1) JSON-LD image
    if (productJson?.image) {
      const img = Array.isArray(productJson.image) ? productJson.image[0] : productJson.image;
      if (img) return img;
    }

    // 2) common meta
    const og = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
    if (og) return og;

    // 3) Site-specific product image selectors
    let selectors = [];
    if (/nykaa/.test(host)) {
      selectors = [
        'img[class*="css"]',
        '[class*="image"] img',
        '[class*="Image"] img',
        '.product-image img',
        'img[class*="product"]',
        'img[alt*="product"]',
        'img[alt*="Product"]',
        'img'
      ];
    } else if (/myntra/.test(host)) {
      selectors = [
        '.image-grid-image',
        '.pdp-image img',
        'img.pdp-img',
        '.image-grid img',
        'img[class*="pdp"]',
        'img'
      ];
    } else {
      selectors = [
        'img.product-image',
        'img#landingImage',
        'img.primary-image',
        '.product-main-image img',
        '.gallery img',
        'img'
      ];
    }

    for (const sel of selectors) {
      const imgEl = $(sel).first();
      if (!imgEl || imgEl.length === 0) continue;
      const attrs = [
        'src', 'data-src', 'data-lazy', 'data-original', 'data-srcset', 'data-hi-res', 'data-zoom-image'
      ];
      for (const a of attrs) {
        const v = imgEl.attr(a);
        if (v && v.trim()) return v.trim();
      }
    }

    // 4) fallback: first <img> with any src-like attr
    const firstImg = $('img').first();
    if (firstImg && firstImg.length) {
      const attrs = ['src','data-src','data-lazy','data-original'];
      for (const a of attrs) {
        const v = firstImg.attr(a);
        if (v && v.trim()) return v.trim();
      }
    }

    return null;
  }

  const rawImage = findFirstImage();
  const image = rawImage ? absoluteUrl(rawImage, pageUrl) : null;

  // Brand
  let brand =
    (productJson?.brand?.name || productJson?.brand) ||
    $('[class*="brand"]').first().text().trim() ||
    (host ? host.split(".")[0] : null);

  // Price: JSON-LD offers first, then selectors
  let price = null;
  if (productJson?.offers) {
    const offers = Array.isArray(productJson.offers) ? productJson.offers[0] : productJson.offers;
    if (offers) price = offers.price || offers.priceSpecification?.price || null;
  }
  if (!price) {
    let priceSelectors = [];
    
    // Site-specific price selectors
    if (/nykaa/.test(host)) {
      priceSelectors = [
        '[class*="css"][class*="price"]',
        '[class*="final"]',
        '[class*="Final"]',
        '[class*="selling"]',
        '[class*="Selling"]',
        '.product-price',
        '[class*="price"]',
        'span[class*="css"]'
      ];
    } else if (/myntra/.test(host)) {
      priceSelectors = [
        '.pdp-price strong',
        '.pdp-price',
        '.pdp-discount-container .pdp-price',
        '[class*="pdp-price"]',
        '.product-price',
        '[class*="price"]'
      ];
    } else {
      priceSelectors = [
        '[data-cy="price-recipe"]',
        '.a-price .a-offscreen',
        '.price',
        '.product-price',
        '[class*="price"]',
        '.selling-price',
        '.final-price',
        '.offer-price',
        '.price-block',
        '.pdp-price',
        '.product-price-value'
      ];
    }
    
    for (const sel of priceSelectors) {
      const element = $(sel).first();
      if (!element || element.length === 0) continue;
      const text = element.text().trim();
      const dataPrice = element.attr("data-price") || element.attr("data-final-price") || element.attr("data-mrp");

      const n = extractNumberFromString(`${text} ${dataPrice ?? ""}`.trim());
      if (n !== null) {
        price = n;
        break;
      }
    }
  } else {
    const parsed = parseFloat(String(price).replace(/[^0-9.]/g, ""));
    price = Number.isFinite(parsed) ? parsed : null;
  }

  // Category heuristics
  let category = productJson?.category || null;
  if (/amazon/.test(host)) category = category || "Electronics";
  if (/myntra/.test(host)) category = category || "Fashion";
  if (/nykaa/.test(host)) category = category || "Fashion"; // Beauty/Cosmetics falls under Fashion
  if (/flipkart/.test(host)) category = category || "Electronics";
  if (/bigbasket|grofers|blinkit|zomato/.test(host)) category = category || "Groceries";

  const result = {
    title: title || null,
    description: description || null,
    image: image || null,
    price: price !== null ? price : null,
    brand: brand || null,
    category: category || null,
    url: pageUrl
  };

  // Debug logging for Nykaa/Myntra
  if (/nykaa|myntra/.test(host)) {
    console.log(`[Scraper Debug] ${host}:`, {
      hasTitle: !!result.title,
      hasPrice: result.price !== null,
      hasImage: !!result.image,
      hasDescription: !!result.description,
      titleLength: result.title?.length || 0,
      descLength: result.description?.length || 0
    });
  }

  return result;
}

/* ---------------------------
   Static scraping using axios + cheerio
   includes anti-bot quick detection
   --------------------------- */
async function scrapeStaticPage(url) {
  try {
    // Parse domain for custom headers
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    const resp = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": `https://${domain}/`,
        "Origin": `https://${domain}`
      },
      timeout: 25000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
      decompress: true
    });

    // quick anti-bot detection
    if (/cloudflare|just a moment|checking your browser|ddos|captcha/i.test(resp.data)) {
      const err = new Error("Anti-bot / challenge detected in HTML content");
      err.isAntiBot = true;
      // Attach some debug info
      err.debug = {
        status: resp.status,
        headers: resp.headers,
        snippet: String(resp.data).slice(0, 2000)
      };
      throw err;
    }

    return parseHtmlContent(resp.data, url);
  } catch (err) {
    throw err;
  }
}

/* ---------------------------
   Playwright fallback (dynamic import + basic stealth)
   - random UA
   - block images/styles/fonts
   - set navigator.webdriver = false
   - small randomized waitForSelector attempts
   --------------------------- */
const USER_AGENTS = [
  // a small list of realistic user agents
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15"
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(min = 300, max = 1200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function scrapeWithPlaywright(url) {
  const { chromium } = await import("playwright");

  // pick random UA
  const ua = randomChoice(USER_AGENTS);

  const browser = await chromium.launch({
    headless: true,
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
      "--flag-switches-begin --disable-site-isolation-trials --flag-switches-end",
      "--disable-blink-features=AutomationControlled",
      "--exclude-switches=enable-automation",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--mute-audio",
      "--no-default-browser-check",
      "--autoplay-policy=user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-notifications",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-sync",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--safebrowsing-disable-auto-update",
      "--enable-automation=false",
      "--password-store=basic",
      "--use-mock-keychain"
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: ua,
      viewport: { width: 1920, height: 1080 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
      javaScriptEnabled: true,
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    const page = await context.newPage();

    // Enhanced stealth: remove webdriver flags before page loads
    await page.addInitScript(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override the plugins to look more realistic
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
        ],
      });

      // Override the languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-IN', 'en-GB', 'en-US', 'en'],
      });

      // Override chrome property to look like real Chrome
      if (!window.chrome) {
        window.chrome = {};
      }
      window.chrome.runtime = {
        connect: () => {},
        sendMessage: () => {},
      };
      window.chrome.loadTimes = () => {};
      window.chrome.csi = () => {};

      // Override permissions
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      }

      // Add realistic screen properties
      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });

      // Override automation-related properties
      delete navigator.__proto__.webdriver;
      
      // Mock battery API
      if (!navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        });
      }
    });

    // Don't block images for Nykaa - they might be needed for detection
    const host = (() => {
      try { return new URL(url).hostname; } catch { return ""; }
    })();
    
    const shouldBlockResources = !/nykaa|myntra/.test(host);
    
    if (shouldBlockResources) {
      await page.route("**/*", (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        if (resourceType === "image" || resourceType === "stylesheet" || resourceType === "font") {
          return route.abort();
        }
        return route.continue();
      });
    }

    // Navigate with longer timeout for heavy sites
    // Use 'load' instead of 'networkidle' to avoid HTTP/2 protocol errors
    const timeout = /nykaa|myntra/.test(host) ? 60000 : 30000;
    const waitUntil = /nykaa|myntra/.test(host) ? "load" : "domcontentloaded";
    
    console.log(`[Playwright] Navigating to ${url} with waitUntil="${waitUntil}", timeout=${timeout}ms`);
    
    try {
      const response = await page.goto(url, { waitUntil, timeout });
      console.log(`[Playwright] Navigation successful, status: ${response?.status()}`);
    } catch (navError) {
      console.warn(`[Playwright] Navigation error: ${navError.message}`);
      
      // Check if it's an HTTP/2 protocol error
      if (navError.message.includes('ERR_HTTP2_PROTOCOL_ERROR')) {
        console.log(`[Playwright] Detected HTTP/2 error, trying with HTTP/1.1 fallback...`);
        // Close current page and create new one with different settings
        await page.close();
        const newPage = await context.newPage();
        
        try {
          const response = await newPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          console.log(`[Playwright] HTTP/1.1 fallback successful, status: ${response?.status()}`);
          // Replace page reference
          Object.assign(page, newPage);
        } catch (http1Error) {
          console.warn(`[Playwright] HTTP/1.1 fallback also failed: ${http1Error.message}`);
          // Continue anyway - page might have partially loaded
        }
      } else {
        // Try standard fallback
        try {
          const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          console.log(`[Playwright] Fallback navigation successful, status: ${response?.status()}`);
        } catch (fallbackError) {
          console.warn(`[Playwright] Fallback navigation also failed: ${fallbackError.message}`);
          // Continue anyway - page might have partially loaded
        }
      }
    }

    // Longer delay for Nykaa/Myntra to let JavaScript render
    const delay = /nykaa|myntra/.test(host) ? randomDelay(2000, 3500) : randomDelay(500, 1400);
    await page.waitForTimeout(delay);

    // Simulate human-like behavior for Nykaa/Myntra
    if (/nykaa|myntra/.test(host)) {
      try {
        // Random mouse movement
        await page.mouse.move(
          Math.floor(Math.random() * 500) + 100,
          Math.floor(Math.random() * 500) + 100
        );
        await page.waitForTimeout(randomDelay(100, 300));
        
        // Scroll down a bit to trigger lazy loading
        await page.evaluate(() => {
          window.scrollBy(0, Math.floor(Math.random() * 300) + 200);
        });
        await page.waitForTimeout(randomDelay(500, 1000));
        
        // Scroll back up
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(randomDelay(300, 600));
      } catch (behaviorError) {
        console.warn("Human behavior simulation failed:", behaviorError.message);
      }
    }

    // Try to wait for obvious product-like selectors for up to a few seconds
    let waitSelectors = [];
    if (/nykaa/.test(host)) {
      waitSelectors = [
        'h1',
        '[class*="price"]',
        '[class*="Price"]',
        'meta[property="og:title"]',
        'img'
      ];
    } else if (/myntra/.test(host)) {
      waitSelectors = [
        'h1.pdp-title',
        '.pdp-price',
        '.pdp-name',
        'meta[property="og:title"]',
        'h1'
      ];
    } else {
      waitSelectors = [
        'meta[property="og:title"]',
        'h1',
        '.product-title',
        '.pdp-title',
        '.product-name',
        '.product-detail'
      ];
    }
    
    for (const sel of waitSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        break;
      } catch (e) {
        // continue trying other selectors
      }
    }

    // additional small delay for lazy loads
    await page.waitForTimeout(randomDelay(400, 1200));

    const content = await page.content();
    await context.close();
    return parseHtmlContent(content, url);
  } finally {
    await browser.close().catch(() => {});
  }
}

/* ---------------------------
   CRUD routes (kept from original)
   --------------------------- */

// List wishlist items for current user (now from Goals)
router.get("/", async (req, res) => {
  try {
    const wishlistGoals = await Goal.find({ 
      userId: req.user.id, 
      isWishlistItem: true,
      status: { $nin: ["archived", "purchased"] }
    }).sort({ priority: 1, createdAt: -1 });
    
    // Transform to match old wishlist format for backward compatibility
    const wishlist = wishlistGoals.map(goal => ({
      _id: goal._id,
      userId: goal.userId,
      title: goal.title,
      description: goal.description,
      url: goal.url,
      price: goal.targetAmount,
      currency: goal.currency,
      priority: goal.priority <= 2 ? "high" : goal.priority <= 3 ? "medium" : "low",
      category: goal.category,
      imageUrl: goal.imageUrl,
      status: goal.status === "purchased" ? "purchased" : "wishlist",
      notes: goal.notes,
      dueDate: goal.dueDate,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      currentAmount: goal.currentAmount
    }));
    
    res.json(wishlist);
  } catch (error) {
    console.error("Wishlist list error:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// Create wishlist item
router.post(
  "/",
  [
    body("title").isString().isLength({ min: 1, max: 200 }),
    body("description").optional().isString().isLength({ max: 2000 }),
    body("url")
      .optional()
      .trim()
      .customSanitizer((value) => {
        if (!value) return value;
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      })
      .isURL({ require_protocol: true })
      .isLength({ max: 2048 }),
    body("price").optional().isFloat({ min: 0 }),
    body("currency").optional().isIn(["INR", "USD", "EUR"]),
    body("priority").optional().isIn(["low", "medium", "high"]),
    body("category").optional().isString().isLength({ max: 100 }),
    body("imageUrl")
      .optional()
      .trim()
      .customSanitizer((value) => {
        if (!value) return value;
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      })
      .isURL({ require_protocol: true })
      .isLength({ max: 2048 }),
    body("notes").optional().isString().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid data", errors: errors.array() });
      }
      
      const existingWithUrl = req.body.url
        ? await Goal.findOne({ userId: req.user.id, url: req.body.url.trim(), isWishlistItem: true, status: { $nin: ["purchased", "archived"] } })
        : null;
      if (existingWithUrl) {
        return res
          .status(409)
          .json({ message: "A wishlist item with this link already exists." });
      }

      // Create as a Goal with wishlist properties
      const goalData = {
        userId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        targetAmount: req.body.price || 0,
        currentAmount: 0,
        dueDate: req.body.dueDate,
        status: "wishlist",
        category: "wishlist",
        priority: req.body.priority === "high" ? 1 : req.body.priority === "medium" ? 3 : 5,
        isWishlistItem: true,
        url: req.body.url,
        imageUrl: req.body.imageUrl,
        currency: req.body.currency || "INR",
        notes: req.body.notes,
        timePeriod: "short-term"
      };

      const goalItem = await Goal.create(goalData);
      
      const responseItem = goalItem.toObject ? goalItem.toObject() : goalItem;
      
      res.status(201).json(responseItem);
    } catch (error) {
      console.error("Create wishlist error:", error);
      res.status(500).json({ message: "Failed to create wishlist item" });
    }
  }
);

// Update wishlist item
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("title").optional().isString().isLength({ min: 1, max: 200 }),
    body("description").optional().isString().isLength({ max: 2000 }),
    body("url").optional().isURL().isLength({ max: 500 }),
    body("price").optional().isFloat({ min: 0 }),
    body("currency").optional().isIn(["INR", "USD", "EUR"]),
    body("priority").optional().isIn(["low", "medium", "high"]),
    body("category").optional().isString().isLength({ max: 100 }),
    body("imageUrl").optional().isURL().isLength({ max: 500 }),
    body("notes").optional().isString().isLength({ max: 1000 }),
    body("status").optional().isIn(["wishlist", "purchased", "removed"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid data", errors: errors.array() });
      }

      // Convert wishlist data to goal format
      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.url) updateData.url = req.body.url;
      if (req.body.price !== undefined) updateData.targetAmount = req.body.price;
      if (req.body.currency) updateData.currency = req.body.currency;
      if (req.body.priority) {
        updateData.priority = req.body.priority === "high" ? 1 : req.body.priority === "medium" ? 3 : 5;
      }
      if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;
      if (req.body.notes) updateData.notes = req.body.notes;
      if (req.body.status) {
        updateData.status = req.body.status === "purchased" ? "purchased" : "wishlist";
      }

      const goalItem = await Goal.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id, isWishlistItem: true },
        updateData,
        { new: true }
      );

      if (!goalItem) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      res.json(goalItem);
    } catch (error) {
      console.error("Update wishlist error:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  }
);

// Delete wishlist item (cascade delete related goals)
router.delete(
  "/:id",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const wishlistItemId = req.params.id;

      // Delete the wishlist goal
      const result = await Goal.findOneAndDelete({
        _id: wishlistItemId,
        userId: req.user.id,
        isWishlistItem: true
      });

      if (!result) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      // Cascade delete: Delete all goals that were created from this wishlist item
      const deletedGoals = await Goal.deleteMany({
        userId: req.user.id,
        sourceWishlistId: wishlistItemId
      });

      console.log(`Deleted wishlist item ${wishlistItemId} and ${deletedGoals.deletedCount} associated goal(s)`);

      res.json({ 
        ok: true,
        message: `Wishlist item deleted${deletedGoals.deletedCount > 0 ? ` and ${deletedGoals.deletedCount} associated goal(s) removed` : ''}`
      });
    } catch (error) {
      console.error("Delete wishlist error:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  }
);

// Mark as purchased
router.patch(
  "/:id/purchase",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const wishlistItem = await Wishlist.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { status: "purchased" },
        { new: true }
      );

      if (!wishlistItem) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      res.json(wishlistItem);
    } catch (error) {
      console.error("Purchase wishlist error:", error);
      res.status(500).json({ message: "Failed to mark as purchased" });
    }
  }
);

/* ---------------------------
   Scrape route: returns more informative errors
   --------------------------- */
router.post(
  "/scrape",
  [
    body("url")
      .trim()
      .customSanitizer((value) => {
        if (!value) return value;
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
      })
      .isURL({ require_protocol: true })
      .isLength({ max: 2048 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid URL", errors: errors.array() });
      }

      const { url } = req.body;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

      // 2) Try static parser
      try {
        const product = await scrapeStaticPage(url);

        // if static parser returned anything useful, return it
        const hasUseful = (product.title && product.price !== null) || product.image || product.description;
        if (hasUseful) {
          return res.json({ success: true, product });
        }

        // otherwise, fall through to Playwright fallback
      } catch (staticErr) {
        console.warn("Static scrape error:", staticErr.message || staticErr);
        
        // Log specific error types
        if (staticErr.code === 'ENOTFOUND') {
          console.warn("DNS resolution failed - invalid domain or network issue");
        } else if (staticErr.code === 'ETIMEDOUT' || staticErr.code === 'ECONNABORTED') {
          console.warn("Request timeout - website is slow or unresponsive");
        } else if (staticErr.response?.status === 403) {
          console.warn("403 Forbidden - website blocking direct access");
        } else if (staticErr.response?.status === 429) {
          console.warn("429 Too Many Requests - rate limited");
        } else if (staticErr.isAntiBot) {
          console.warn("Anti-bot challenge detected (Cloudflare, Captcha, etc.)");
        }
        
        // If axios response attached debug info, include it in logs
        if (staticErr.debug) {
          console.warn("Static scrape debug:", {
            status: staticErr.debug.status,
            headersSnippet: Object.keys(staticErr.debug.headers || {}).slice(0, 10),
            htmlSnippet: String(staticErr.debug.snippet || "").slice(0, 500)
          });
        }
        // continue to Playwright fallback
      }

      // 3) Playwright fallback
      try {
        console.log(`[Scraper] Using Playwright for ${url}`);
        const product = await scrapeWithPlaywright(url);
        const hasUseful = (product.title && product.price !== null) || product.image || product.description;
        if (hasUseful) {
          console.log(`[Scraper] Successfully extracted product data via Playwright`);
          return res.json({ success: true, product });
        } else {
          // Playwright succeeded but page lacked structured info
          console.warn(`[Scraper] Playwright succeeded but data is sparse`);
          return res.status(200).json({
            success: true,
            product,
            note: "Rendered page scraped but product data is sparse. You may need to edit fields manually."
          });
        }
      } catch (pwErr) {
        console.error("Playwright scrape error:", pwErr.message || pwErr);
        console.error("Stack trace:", pwErr.stack);
        
        // Check if it's a Playwright installation issue
        const isInstallError = /install/i.test(pwErr.message) || 
                              /Could not find|cannot find|ENOENT/.test(pwErr.message) ||
                              /chromium|browser/.test(pwErr.message);
        
        if (isInstallError) {
          console.error("⚠️  Playwright browser not installed. Run: npx playwright install chromium");
          return res.status(500).json({
            success: false,
            message: "Browser automation is not properly set up on the server. Please contact support.",
            error: "Playwright browser missing",
            hint: "Server admin: Run 'npx playwright install chromium' in the server directory"
          });
        }
        
        // For other errors, provide helpful guidance
        let userMessage = "Failed to scrape product details. ";
        
        if (/timeout/i.test(pwErr.message)) {
          userMessage += "The website took too long to respond. Please try again or enter details manually.";
        } else if (/navigation|net::ERR/.test(pwErr.message)) {
          userMessage += "Could not connect to the website. Please check the URL and try again.";
        } else if (/blocked|refused|403|401/.test(pwErr.message)) {
          userMessage += "The website is blocking automated access. Please try entering the details manually.";
        } else {
          userMessage += "The website may be blocking automated access. Please try again or enter details manually.";
        }
        
        const response = {
          success: false,
          message: userMessage,
          error: pwErr.message,
          canRetry: /timeout|navigation/.test(pwErr.message)
        };
        
        return res.status(500).json(response);
      }
    } catch (error) {
      console.error("Unexpected scrape error:", error);
      return res.status(500).json({ success: false, message: "Unexpected server error during scraping", error: String(error) });
    }
  }
);

// Add marketplace item to wishlist
router.post("/add", async (req, res) => {
  try {
    const { marketplaceItemId } = req.body;
    
    if (!marketplaceItemId) {
      return res.status(400).json({ message: "Marketplace item ID is required" });
    }
    
    // Check if already in wishlist
    const existing = await Goal.findOne({
      userId: req.user.id,
      marketplaceItemId,
      isWishlistItem: true,
      status: { $nin: ["archived", "purchased"] }
    });
    
    if (existing) {
      return res.status(409).json({ message: "Item already in wishlist" });
    }
    
    // Get marketplace item details
    const Marketplace = (await import("../models/Marketplace.js")).default;
    const item = await Marketplace.findById(marketplaceItemId);
    
    if (!item) {
      return res.status(404).json({ message: "Marketplace item not found" });
    }
    
    // Create wishlist goal
    const wishlistGoal = await Goal.create({
      userId: req.user.id,
      title: item.title,
      description: item.description,
      targetAmount: item.price,
      currentAmount: 0,
      category: "wishlist",
      status: "wishlist",
      priority: 3,
      isWishlistItem: true,
      marketplaceItemId: item._id,
      imageUrl: item.images?.[0]?.url || item.images?.[0],
      currency: "INR",
      timePeriod: "short-term"
    });
    
    res.status(201).json(wishlistGoal);
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
});

// Remove marketplace item from wishlist
router.delete("/remove/:marketplaceItemId", async (req, res) => {
  try {
    const { marketplaceItemId } = req.params;
    
    const result = await Goal.findOneAndDelete({
      userId: req.user.id,
      marketplaceItemId,
      isWishlistItem: true
    });
    
    if (!result) {
      return res.status(404).json({ message: "Item not in wishlist" });
    }
    
    res.json({ ok: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
});

export default router;
