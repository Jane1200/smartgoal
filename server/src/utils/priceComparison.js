/**
 * Price Comparison Utility
 * Uses REST/JSON APIs where available (Croma, Reliance Digital)
 * and enhanced HTML scraping with proper browser headers for Amazon & Flipkart.
 */
import axios from "axios";
import * as cheerio from "cheerio";

const TIMEOUT = 14000;

// ── Shared realistic browser headers ─────────────────────────────────────────
const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function htmlHeaders(referer) {
  return {
    ...BASE_HEADERS,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    Referer: referer,
  };
}

function jsonHeaders(referer, origin) {
  return {
    ...BASE_HEADERS,
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Referer: referer,
    Origin: origin,
  };
}

// ── Query builder ─────────────────────────────────────────────────────────────
function buildQuery(title) {
  return title
    .replace(/amazon\.in|flipkart\.com|myntra\.com|nykaa\.com/gi, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8)
    .join(" ")
    .trim();
}

function encQ(q) { return encodeURIComponent(q); }

// ── 1. Amazon.in — HTML scraping (works reliably) ────────────────────────────
async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.in/s?k=${encQ(query)}&ref=nb_sb_noss`;
  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: htmlHeaders("https://www.amazon.in/"),
      timeout: TIMEOUT,
      maxRedirects: 5,
    });
    const $ = cheerio.load(html);
    const results = [];

    $('[data-component-type="s-search-result"]').each((_, el) => {
      if (results.length >= 4) return false;
      const title = $(el).find("h2 span").first().text().trim()
        || $(el).find(".a-size-medium").first().text().trim();
      const priceText = $(el).find(".a-price .a-offscreen").first().text();
      const price = parseFloat(priceText.replace(/[₹,\s]/g, ""));
      const href = $(el).find("h2 a.a-link-normal").attr("href");
      const url = href
        ? (href.startsWith("http") ? href : `https://www.amazon.in${href}`)
        : searchUrl;

      if (title && !isNaN(price) && price > 0) {
        results.push({ title, price, url });
      }
    });

    return { site: "Amazon.in", searchUrl, results, logo: "amazon" };
  } catch {
    return { site: "Amazon.in", searchUrl, results: [], logo: "amazon" };
  }
}

// ── 2. Flipkart — JSON embedded in HTML page ──────────────────────────────────
async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encQ(query)}&otracker=search&marketplace=FLIPKART`;
  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: htmlHeaders("https://www.flipkart.com/"),
      timeout: TIMEOUT,
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);
    const results = [];

    // Flipkart embeds product data as JSON in <script id="is_script">
    // Try to extract it first (most reliable)
    let jsonExtracted = false;
    $("script").each((_, el) => {
      if (jsonExtracted) return;
      const text = $(el).html() || "";
      // Look for the __INITIAL_STATE__ or similar pattern
      const match = text.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s)
        || text.match(/window\._QF\s*=\s*(\{.+?\});/s);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          // Try to dig into product listings
          const pageData = JSON.stringify(json);
          const priceRegex = /"finalPrice":(\d+)/g;
          const titleRegex = /"title":"([^"]+)"/g;
          const urlRegex = /"productUrl":"([^"]+)"/g;

          const prices = [...pageData.matchAll(priceRegex)].map((m) => parseInt(m[1]));
          const titles = [...pageData.matchAll(titleRegex)].map((m) => m[1]);
          const urls   = [...pageData.matchAll(urlRegex)].map((m) => m[1]);

          for (let i = 0; i < Math.min(4, prices.length); i++) {
            if (prices[i] > 0 && titles[i]) {
              results.push({
                title: titles[i],
                price: prices[i],
                url: urls[i]
                  ? `https://www.flipkart.com${urls[i]}`
                  : searchUrl,
              });
            }
          }
          if (results.length > 0) jsonExtracted = true;
        } catch { /* continue */ }
      }
    });

    // Fallback: HTML selectors (Flipkart changes these often but try)
    if (!jsonExtracted) {
      const TITLE_SEL  = ["._4rR01T", ".s1Q9rs", ".KzDlHZ", "._2WkVRV", "a.IRpwTa"];
      const PRICE_SEL  = ["._30jeq3", "._1_WHN1", ".Nx9bqj", "._16Jk6d", ".hl05eU span"];
      const LINK_SEL   = ["._1fQZEK", "._2rpwqI", "a.CGtC98", "a._1NtyNb"];
      const WRAP_SEL   = ["._1AtVbE", "._2kHMtA", "._4ddWXP", ".col-12-12", "._3pLy-c"];

      let items = $();
      for (const s of WRAP_SEL) {
        items = $(s);
        if (items.length > 2) break;
      }

      items.each((_, el) => {
        if (results.length >= 4) return false;

        let title = "";
        for (const s of TITLE_SEL) {
          title = $(el).find(s).first().text().trim();
          if (title) break;
        }

        let priceText = "";
        for (const s of PRICE_SEL) {
          priceText = $(el).find(s).first().text().trim();
          if (priceText) break;
        }
        const price = parseFloat(priceText.replace(/[₹,\s]/g, ""));

        let href = "";
        for (const s of LINK_SEL) {
          href = $(el).find(s).attr("href") || "";
          if (href) break;
        }
        const url = href
          ? (href.startsWith("http") ? href : `https://www.flipkart.com${href}`)
          : searchUrl;

        if (title && !isNaN(price) && price > 0) {
          results.push({ title, price, url });
        }
      });
    }

    return { site: "Flipkart", searchUrl, results, logo: "flipkart" };
  } catch {
    return { site: "Flipkart", searchUrl, results: [], logo: "flipkart" };
  }
}

// ── 3. Croma — REST JSON API (most reliable) ──────────────────────────────────
async function scrapeCroma(query) {
  const searchUrl = `https://www.croma.com/searchB?q=${encQ(query)}%3Arelevance&text=${encQ(query)}`;

  // Croma exposes a public JSON API used by their own frontend
  const apiUrl = `https://api.croma.com/searchservices/v1/search?q=${encQ(query)}&currentPage=0&pageSize=6&lang=en&curr=INR`;
  try {
    const { data } = await axios.get(apiUrl, {
      headers: jsonHeaders("https://www.croma.com/", "https://www.croma.com"),
      timeout: TIMEOUT,
    });

    const results = [];
    const products = data?.products || data?.data?.products || [];

    for (const p of products.slice(0, 4)) {
      const title = p.name || p.summary || p.title || "";
      const price = p.price?.value || p.offerPrice || p.sellingPrice || 0;
      const slug  = p.url || p.slug || "";
      const url   = slug
        ? (slug.startsWith("http") ? slug : `https://www.croma.com${slug}`)
        : searchUrl;

      if (title && price > 0) {
        results.push({ title, price, url });
      }
    }

    return { site: "Croma", searchUrl, results, logo: "croma" };
  } catch {
    // Fallback: HTML scraping
    try {
      const { data: html } = await axios.get(searchUrl, {
        headers: htmlHeaders("https://www.croma.com/"),
        timeout: TIMEOUT,
      });
      const $ = cheerio.load(html);
      const results = [];

      $("li.product, .product-item, [class*='product-grid']").each((_, el) => {
        if (results.length >= 4) return false;
        const title = $(el).find("h3, .product-title, [class*='title']").first().text().trim();
        const priceText = $(el).find("[class*='price'], [class*='amount']").first().text().trim();
        const price = parseFloat(priceText.replace(/[₹,\s]/g, ""));
        const href = $(el).find("a").first().attr("href");
        const url = href
          ? (href.startsWith("http") ? href : `https://www.croma.com${href}`)
          : searchUrl;
        if (title && !isNaN(price) && price > 0) results.push({ title, price, url });
      });

      return { site: "Croma", searchUrl, results, logo: "croma" };
    } catch {
      return { site: "Croma", searchUrl, results: [], logo: "croma" };
    }
  }
}

// ── 4. Reliance Digital — REST JSON API ───────────────────────────────────────
async function scrapeRelianceDigital(query) {
  const searchUrl = `https://www.reliancedigital.in/search?q=${encQ(query)}:relevance`;

  // Reliance Digital Solr-based search API
  const apiUrl = `https://www.reliancedigital.in/rildigitalws/v2/rn/products/search?q=${encQ(query)}&pageNumber=0&pageSize=6&intentSearch=false&filterFlag=true`;
  try {
    const { data } = await axios.get(apiUrl, {
      headers: jsonHeaders("https://www.reliancedigital.in/", "https://www.reliancedigital.in"),
      timeout: TIMEOUT,
    });

    const results = [];
    // Navigate possible response shapes
    const products =
      data?.products ||
      data?.data?.products ||
      data?.searchResult?.products ||
      [];

    for (const p of products.slice(0, 4)) {
      const title = p.name || p.title || p.displayName || "";
      const price =
        p.price?.value ||
        p.offerPrice ||
        p.sellingPrice ||
        p.discountedPrice ||
        0;
      const slug = p.url || p.productUrl || p.pdpUrl || "";
      const url = slug
        ? (slug.startsWith("http") ? slug : `https://www.reliancedigital.in${slug}`)
        : searchUrl;

      if (title && price > 0) {
        results.push({ title, price, url });
      }
    }

    return { site: "Reliance Digital", searchUrl, results, logo: "reliance" };
  } catch {
    // Fallback: HTML scraping
    try {
      const { data: html } = await axios.get(searchUrl, {
        headers: htmlHeaders("https://www.reliancedigital.in/"),
        timeout: TIMEOUT,
      });
      const $ = cheerio.load(html);
      const results = [];

      $(".product, .product-wrap, [class*='product-item']").each((_, el) => {
        if (results.length >= 4) return false;
        const title = $(el).find("p.product-title, [class*='title'], h3").first().text().trim();
        const priceText = $(el).find("[class*='price'], [class*='amount']").first().text().trim();
        const price = parseFloat(priceText.replace(/[₹,\s]/g, ""));
        const href = $(el).find("a").first().attr("href");
        const url = href
          ? (href.startsWith("http") ? href : `https://www.reliancedigital.in${href}`)
          : searchUrl;
        if (title && !isNaN(price) && price > 0) results.push({ title, price, url });
      });

      return { site: "Reliance Digital", searchUrl, results, logo: "reliance" };
    } catch {
      return { site: "Reliance Digital", searchUrl, results: [], logo: "reliance" };
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function comparePrices(title, savedPrice = null) {
  const query = buildQuery(title);
  if (!query) return { sites: [], query: title, lowestPrice: null, savings: null };

  const scrapers = [scrapeAmazon, scrapeFlipkart, scrapeCroma, scrapeRelianceDigital];

  // Run all scrapers in parallel; each has its own internal timeout
  const settled = await Promise.allSettled(
    scrapers.map((fn) =>
      Promise.race([
        fn(query),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("global timeout")), 18000)
        ),
      ])
    )
  );

  const sites = settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { site: "Unknown", searchUrl: "", results: [], logo: "" }
  );

  // Sort results per site: cheapest first
  for (const site of sites) {
    site.results.sort((a, b) => a.price - b.price);
  }

  // Find global lowest price
  let lowestPrice = null;
  let lowestSite  = null;
  let lowestUrl   = null;

  for (const site of sites) {
    for (const item of site.results) {
      if (lowestPrice === null || item.price < lowestPrice) {
        lowestPrice = item.price;
        lowestSite  = site.site;
        lowestUrl   = item.url;
      }
    }
  }

  // Savings vs wishlist saved price
  let savings = null;
  let savingsPercent = null;
  if (savedPrice && lowestPrice && lowestPrice < savedPrice) {
    savings = Math.round(savedPrice - lowestPrice);
    savingsPercent = Math.round((savings / savedPrice) * 100);
  }

  return {
    query,
    sites,
    lowestPrice,
    lowestSite,
    lowestUrl,
    savedPrice,
    savings,
    savingsPercent,
  };
}
